import type { FormEvent } from 'react';
import type { DocumentEditState } from '../../app/types';
import { ModalDialog } from './ModalDialog';

export function DocumentEditModal({
  documentEditState,
  onClose,
  onFieldChange,
  onSave,
}: {
  documentEditState: DocumentEditState;
  onClose: () => void;
  onFieldChange: (field: keyof Omit<DocumentEditState, 'id' | 'filePath'>, value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <ModalDialog
      id="document-edit-title"
      title={documentEditState.name}
      eyebrow="Dokument bearbeiten"
      actions={(
        <>
          <button type="button" className="secondary-action" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" form="document-edit-form">
            Änderungen speichern
          </button>
        </>
      )}
    >
      <form id="document-edit-form" className="modal-form" onSubmit={(event) => void onSave(event)}>
          <input
            aria-label="Dokumentname bearbeiten"
            value={documentEditState.name}
            onChange={(event) => onFieldChange('name', event.currentTarget.value)}
          />
          <input
            aria-label="Dokumentkategorie bearbeiten"
            value={documentEditState.category}
            onChange={(event) => onFieldChange('category', event.currentTarget.value)}
          />
          <input
            aria-label="Dokumentstatus bearbeiten"
            value={documentEditState.status}
            onChange={(event) => onFieldChange('status', event.currentTarget.value)}
          />
          {documentEditState.filePath ? null : (
            <input
              aria-label="Dokumentlink bearbeiten"
              type="url"
              placeholder="Link zum Dokument"
              value={documentEditState.linkUrl}
              onChange={(event) => onFieldChange('linkUrl', event.currentTarget.value)}
            />
          )}
      </form>
    </ModalDialog>
  );
}