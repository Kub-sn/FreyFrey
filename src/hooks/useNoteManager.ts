import { useEffect, useState, type FormEvent } from 'react';
import type { PlannerState } from '../lib/planner-data';
import type {
  AuthState,
  CloudSyncSetterValue,
  NoteDialogState,
  PendingNoteDeletionState,
} from '../app/types';
import { createNote, deleteNote, updateNote } from '../lib/supabase';
import { humanizeAuthError } from '../lib/auth-errors';
import { nextStringId } from '../lib/id';
import { clearUiDraft, loadUiDraft, saveUiDraft } from '../lib/storage';

type UseNoteManagerParams = {
  authState: AuthState;
  plannerState: PlannerState;
  setCloudSync: (value: CloudSyncSetterValue) => void;
  updateState: (updater: (current: PlannerState) => PlannerState) => void;
};

const NOTE_DIALOG_STORAGE_KEY = 'note-dialog-edit';

export function useNoteManager({
  authState,
  plannerState,
  setCloudSync,
  updateState,
}: UseNoteManagerParams) {
  const [noteDialogState, setNoteDialogState] = useState<NoteDialogState | null>(() =>
    loadUiDraft<NoteDialogState | null>(NOTE_DIALOG_STORAGE_KEY, null),
  );
  const [pendingNoteDeletion, setPendingNoteDeletion] = useState<PendingNoteDeletionState | null>(null);
  const [noteDeletionBusy, setNoteDeletionBusy] = useState(false);

  useEffect(() => {
    if (!noteDialogState?.isEditing) {
      clearUiDraft(NOTE_DIALOG_STORAGE_KEY);
      return;
    }

    const currentNoteStillExists = plannerState.notes.some((note) => note.id === noteDialogState.id);

    if (!currentNoteStillExists) {
      setNoteDialogState(null);
      clearUiDraft(NOTE_DIALOG_STORAGE_KEY);
      return;
    }

    saveUiDraft(NOTE_DIALOG_STORAGE_KEY, noteDialogState);
  }, [noteDialogState, plannerState.notes]);

  const handleAddNote = async (title: string, text: string) => {
    const normalizedTitle = title.trim();
    const normalizedText = text.trim();

    if (!normalizedText) {
      return false;
    }

    try {
      if (authState.family) {
        const createdNote = await createNote(authState.family.familyId, {
          title: normalizedTitle,
          text: normalizedText,
        });
        updateState((current) => ({
          ...current,
          notes: [createdNote, ...current.notes],
        }));
        setCloudSync({
          phase: 'ready',
          message: 'Notiz wurde gespeichert.',
        });
      } else {
        updateState((current) => ({
          ...current,
          notes: [{ id: nextStringId(), title: normalizedTitle, text: normalizedText }, ...current.notes],
        }));
      }

      return true;
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });

      return false;
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const note = plannerState.notes.find((entry) => entry.id === noteId);
    if (!note) {
      return;
    }
    setPendingNoteDeletion({ id: note.id, title: note.title });
  };

  const handleConfirmNoteDeletion = async () => {
    if (!pendingNoteDeletion) {
      return;
    }
    setNoteDeletionBusy(true);

    try {
      if (authState.family) {
        await deleteNote(pendingNoteDeletion.id);
      }
      updateState((current) => ({
        ...current,
        notes: current.notes.filter((note) => note.id !== pendingNoteDeletion.id),
      }));
      setNoteDialogState((current) => (current?.id === pendingNoteDeletion.id ? null : current));
      setPendingNoteDeletion(null);
      setCloudSync({
        phase: 'ready',
        message: 'Notiz wurde gelöscht.',
      });
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    } finally {
      setNoteDeletionBusy(false);
    }
  };

  const handleOpenNote = (noteId: string) => {
    const note = plannerState.notes.find((entry) => entry.id === noteId);
    if (!note) {
      return;
    }
    setNoteDialogState({ ...note, isEditing: false });
  };

  const handleNoteDialogFieldChange = (field: 'title' | 'text', value: string) => {
    setNoteDialogState((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSaveNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!noteDialogState) {
      return;
    }
    const title = noteDialogState.title.trim();
    const text = noteDialogState.text.trim();

    if (!text) {
      return;
    }

    try {
      let savedNote = { id: noteDialogState.id, title, text };
      if (authState.family) {
        savedNote = await updateNote(noteDialogState.id, { title, text });
        setCloudSync({
          phase: 'ready',
          message: 'Notiz wurde aktualisiert.',
        });
      }
      updateState((current) => ({
        ...current,
        notes: current.notes.map((note) => (note.id === savedNote.id ? savedNote : note)),
      }));
      setNoteDialogState(null);
      clearUiDraft(NOTE_DIALOG_STORAGE_KEY);
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  return {
    noteDialogState,
    setNoteDialogState,
    pendingNoteDeletion,
    setPendingNoteDeletion,
    noteDeletionBusy,
    handleAddNote,
    handleDeleteNote,
    handleConfirmNoteDeletion,
    handleOpenNote,
    handleNoteDialogFieldChange,
    handleSaveNote,
  };
}
