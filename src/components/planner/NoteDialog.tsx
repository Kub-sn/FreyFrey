import type { FormEvent } from 'react';
import type { NoteDialogState } from '../../app/types';
import { ModalDialog } from './ModalDialog';

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
      className="note-dialog-card"
      actions={note.isEditing ? (
        <div key="editing-actions" className="modal-action-group">
          <button type="button" className="secondary-action" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" form="note-edit-form" className="auth-submit">
            Änderungen speichern
          </button>
        </div>
      ) : (
        <div key="view-actions" className="modal-action-group">
          <button type="button" className="secondary-action" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="secondary-action" onClick={onEdit}>
            Bearbeiten
          </button>
        </div>
      )}
    >
      {note.isEditing ? (
        <form id="note-edit-form" className="modal-form" onSubmit={(event) => void onSave(event)}>
            <input
              aria-label="Notiztitel bearbeiten"
              value={note.title}
              onChange={(event) => onFieldChange('title', event.currentTarget.value)}
            />
            <textarea
              aria-label="Notizinhalt bearbeiten"
              rows={12}
              value={note.text}
              onChange={(event) => onFieldChange('text', event.currentTarget.value)}
            />
        </form>
      ) : (
        <div className="note-dialog-body">
          <p className="modal-note note-dialog-copy">{note.text}</p>
        </div>
      )}
    </ModalDialog>
  );
}