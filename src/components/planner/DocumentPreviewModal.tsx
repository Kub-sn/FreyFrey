import type { DocumentPreviewState } from '../../app/types';

export function DocumentPreviewModal({
  documentPreviewState,
  onClose,
}: {
  documentPreviewState: DocumentPreviewState;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card modal-card-wide" role="dialog" aria-modal="true" aria-labelledby="document-preview-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Dokument-Vorschau</p>
            <h3 id="document-preview-title">{documentPreviewState.name}</h3>
          </div>
          <button type="button" className="secondary-action" onClick={onClose}>
            Schließen
          </button>
        </div>
        <div className="document-preview-modal-body">
          {documentPreviewState.kind === 'image' ? (
            <img
              className="document-preview-full"
              src={documentPreviewState.url}
              alt={`Vorschau für ${documentPreviewState.name}`}
            />
          ) : (
            <iframe
              className="document-preview-frame"
              src={documentPreviewState.url}
              title={`PDF-Vorschau für ${documentPreviewState.name}`}
            />
          )}
        </div>
        <div className="modal-actions">
          <a className="secondary-action modal-link-button" href={documentPreviewState.url} target="_blank" rel="noreferrer">
            In neuem Tab öffnen
          </a>
        </div>
      </section>
    </div>
  );
}