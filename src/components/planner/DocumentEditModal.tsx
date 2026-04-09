import type { FormEvent } from 'react';
import type { DocumentEditState } from '../../app/types';

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
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="document-edit-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Dokument bearbeiten</p>
            <h3 id="document-edit-title">{documentEditState.name}</h3>
          </div>
          <button type="button" className="secondary-action" onClick={onClose}>
            Schließen
          </button>
        </div>
        <form className="modal-form" onSubmit={(event) => void onSave(event)}>
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
          {documentEditState.filePath ? (
            <p className="modal-note">Datei-Uploads behalten ihren Storage-Link. Nur die Metadaten werden geändert.</p>
          ) : (
            <input
              aria-label="Dokumentlink bearbeiten"
              type="url"
              placeholder="Link zum Dokument"
              value={documentEditState.linkUrl}
              onChange={(event) => onFieldChange('linkUrl', event.currentTarget.value)}
            />
          )}
          <div className="modal-actions">
            <button type="button" className="secondary-action" onClick={onClose}>
              Abbrechen
            </button>
            <button type="submit">Änderungen speichern</button>
          </div>
        </form>
      </section>
    </div>
  );
}