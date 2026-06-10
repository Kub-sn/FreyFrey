import type { FormEvent } from 'react';
import type { NoteDialogState } from '../../app/types';
import { AppButton } from '../ui/AppButton';
import { appInputClassName } from '../ui/AppField';
import { ModalDialog } from './ModalDialog';
import { NoteRichTextContent } from './NoteRichTextContent';
import { NoteRichTextEditor } from './NoteRichTextEditor';

export function NoteDialog({
  note,
  onClose,
  onEdit,
  onFieldChange,
  onSave,
}: {
  note: NoteDialogState;
  onClose: () => void;
  onEdit: () => void;
  onFieldChange: (field: 'title' | 'text', value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <ModalDialog
      id="note-dialog-title"
      title={note.title}
      eyebrow="Notiz"
      className="w-[min(760px,100%)]"
      actions={note.isEditing ? (
        <div key="editing-actions" className="flex flex-wrap gap-3">
          <AppButton type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </AppButton>
          <AppButton type="submit" form="note-edit-form" variant="primary">
            Änderungen speichern
          </AppButton>
        </div>
      ) : (
        <div key="view-actions" className="flex flex-wrap gap-3">
          <AppButton type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </AppButton>
          <AppButton type="button" variant="secondary" onClick={onEdit}>
            Bearbeiten
          </AppButton>
        </div>
      )}
    >
      {note.isEditing ? (
        <form id="note-edit-form" className="dialog-form form-panel grid min-w-0 gap-[0.8rem]" onSubmit={(event) => void onSave(event)}>
            <input
              className={appInputClassName()}
              aria-label="Notiztitel bearbeiten"
              value={note.title}
              onChange={(event) => onFieldChange('title', event.currentTarget.value)}
            />
            <NoteRichTextEditor
              ariaLabel="Notizinhalt bearbeiten"
              value={note.text}
              onChange={(value) => onFieldChange('text', value)}
            />
        </form>
      ) : (
        <div className="max-h-[min(60vh,38rem)] overflow-auto">
          <NoteRichTextContent className="m-0 rounded-[18px] bg-[rgba(24,52,47,0.08)] p-[0.9rem_1rem] text-[rgba(24,52,47,0.78)] leading-[1.5] [overflow-wrap:anywhere] break-words hyphens-auto" value={note.text} />
        </div>
      )}
    </ModalDialog>
  );
}