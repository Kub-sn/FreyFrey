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
        <div className="flex flex-wrap gap-3">
          <button type="button" className="secondary-action" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" form="document-edit-form" className="auth-submit">
            Änderungen speichern
          </button>
        </div>
      )}
    >
      <form id="document-edit-form" className="dialog-form form-panel grid min-w-0 gap-[0.8rem]" onSubmit={(event) => void onSave(event)}>
          <input
            aria-label="Dokumentname bearbeiten"
            value={documentEditState.name}
            onChange={(event) => onFieldChange('name', event.currentTarget.value)}
          />
      </form>
    </ModalDialog>
  );
}