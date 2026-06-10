import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { PlannerState } from '../../lib/planner-data';
import { useActiveTab } from '../../context/ActiveTabContext';
import { clearUiDraft, loadUiDraft, saveUiDraft } from '../../lib/storage';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import type { FieldErrors } from '../../lib/form-validation';
import { CreateNoteDialog } from './CreateNoteDialog';

type NoteCreateDraft = {
  title: string;
  text: string;
};

type PersistedNoteCreateState = {
  isDialogOpen: boolean;
  draft: NoteCreateDraft;
};

const NOTES_CREATE_STORAGE_KEY = 'notes-create';
const EMPTY_NOTE_DRAFT: NoteCreateDraft = {
  title: '',
  text: '',
};

function isNoteCreateDraft(value: unknown): value is NoteCreateDraft {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof (value as NoteCreateDraft).title === 'string'
    && typeof (value as NoteCreateDraft).text === 'string',
  );
}

function isPersistedNoteCreateState(value: unknown): value is PersistedNoteCreateState {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof (value as PersistedNoteCreateState).isDialogOpen === 'boolean'
    && isNoteCreateDraft((value as PersistedNoteCreateState).draft),
  );
}

function loadInitialCreateState(): PersistedNoteCreateState {
  const persistedState = loadUiDraft<unknown | null>(NOTES_CREATE_STORAGE_KEY, null);

  if (isPersistedNoteCreateState(persistedState)) {
    return persistedState;
  }

  if (isNoteCreateDraft(persistedState)) {
    return {
      isDialogOpen: Boolean(persistedState.title || persistedState.text),
      draft: persistedState,
    };
  }

  return {
    isDialogOpen: false,
    draft: EMPTY_NOTE_DRAFT,
  };
}

export function NotesModule({
  notes,
  onAddNote,
  onDeleteNote,
  onOpenNote,
}: {
  notes: PlannerState['notes'];
  onAddNote: (title: string, text: string) => Promise<boolean>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onOpenNote: (noteId: string) => void;
}) {
  const { activeTab } = useActiveTab();
  const [initialCreateState] = useState(loadInitialCreateState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(initialCreateState.isDialogOpen);
  const [draft, setDraft] = useState<NoteCreateDraft>(initialCreateState.draft);

  const persistCreateDraft = (nextIsDialogOpen: boolean, nextDraft: NoteCreateDraft) => {
    if (!nextIsDialogOpen) {
      clearUiDraft(NOTES_CREATE_STORAGE_KEY);
      return;
    }

    saveUiDraft<PersistedNoteCreateState>(NOTES_CREATE_STORAGE_KEY, {
      isDialogOpen: nextIsDialogOpen,
      draft: nextDraft,
    });
  };

  const updateDraft = (updater: (current: NoteCreateDraft) => NoteCreateDraft) => {
    setDraft((current) => {
      const next = updater(current);
      persistCreateDraft(isCreateDialogOpen, next);
      return next;
    });
  };

  const handleOpenCreateDialog = () => {
    setErrors({});
    setIsCreateDialogOpen(true);
    persistCreateDraft(true, draft);
  };

  const handleCloseCreateDialog = () => {
    setErrors({});
    setDraft(EMPTY_NOTE_DRAFT);
    setIsCreateDialogOpen(false);
    clearUiDraft(NOTES_CREATE_STORAGE_KEY);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.text.trim()) {
      setErrors({ text: 'Inhalt ist erforderlich.' });
      return;
    }

    setErrors({});
    const didSave = await onAddNote(draft.title, draft.text);

    if (!didSave) {
      return;
    }

    setDraft(EMPTY_NOTE_DRAFT);
    setIsCreateDialogOpen(false);
    clearUiDraft(NOTES_CREATE_STORAGE_KEY);
  };

  const clearFieldError = (name: string) =>
    setErrors((current) => {
      if (!current[name]) return current;
      const { [name]: _removed, ...rest } = current;
      return rest;
    });

  const handleFieldChange = (field: 'title' | 'text', value: string) => {
    updateDraft((current) => ({ ...current, [field]: value }));

    if (field === 'text') {
      clearFieldError('text');
    }
  };

  return (
    <section className={activeTab === 'notes' ? 'module is-visible' : 'module'}>
      <div className="grid content-start gap-4 max-mobile:gap-3">
        <div className="flex items-start max-mobile:w-full">
          <AppButton
            type="button"
            variant="secondary"
            className="inline-flex items-center gap-2.5 border-[rgba(25,98,77,0.18)] bg-[rgba(255,250,244,0.96)] text-[#19624d] shadow-[0_16px_32px_rgba(24,52,47,0.08)] hover:bg-[rgba(243,249,246,0.98)] max-mobile:w-full max-mobile:justify-center"
            onClick={handleOpenCreateDialog}
          >
            <Plus aria-hidden="true" size={18} strokeWidth={2.4} />
            <span>Neue Notiz erstellen</span>
          </AppButton>
        </div>
          <div className="columns-2 gap-x-[1.15rem] max-mobile:columns-1">
            {notes.length > 0 ? notes.map((note) => (
              <article key={note.id} className="note-card break-inside-avoid relative grid mb-4 p-0 w-full max-w-full max-h-[15rem] overflow-hidden rounded-[24px] bg-[rgba(255,248,239,0.92)]">
                <button
                  type="button"
                  className="absolute top-[0.85rem] right-[0.85rem] z-[1] inline-flex items-center justify-center min-w-[2.35rem] min-h-[2.35rem] p-[0.35rem] mb-[0.6rem] rounded-full bg-[#db8e95] text-white leading-none hover:bg-[#d27d85] [&_svg]:w-4 [&_svg]:h-4"
                  aria-label={`Notiz ${note.title} löschen`}
                  onClick={() => void onDeleteNote(note.id)}
                >
                  <Trash2 aria-hidden="true" size={16} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  className="appearance-none grid gap-3 w-full p-4 border-none bg-transparent text-left cursor-pointer pt-[1.2rem] pr-[4.3rem] max-compact:pt-[1.35rem] max-compact:pr-[4.75rem]"
                  onClick={() => onOpenNote(note.id)}
                  aria-label={`Notiz ${note.title} öffnen`}
                >
                  <h4 className="m-0 pt-0 pr-0 [overflow-wrap:anywhere] break-words hyphens-auto line-clamp-2">{note.title}</h4>
                  <p className="m-0 leading-[1.6] [overflow-wrap:anywhere] break-words hyphens-auto line-clamp-5">{note.text}</p>
                </button>
              </article>
            )) : null}
            {notes.length === 0 ? <p className="py-3 text-[rgba(24,52,47,0.55)] italic border-none list-none">Keine Notizen vorhanden</p> : null}
          </div>
      </div>

      {isCreateDialogOpen ? (
        <CreateNoteDialog
          draft={draft}
          errorMessage={errors.text}
          onClose={handleCloseCreateDialog}
          onFieldChange={handleFieldChange}
          onSave={handleSubmit}
        />
      ) : null}
    </section>
  );
}