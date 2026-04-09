import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import type { DocumentFilterKind, DocumentSortOption } from '../../app/types';
import type { PlannerState } from '../../lib/planner-data';
import type { DocumentItem } from '../../lib/planner-data';
import {
  canPreviewDocument,
  DOCUMENT_KIND_FILTER_OPTIONS,
  DOCUMENT_SORT_OPTIONS,
  getDocumentIcon,
  getDocumentMetaParts,
  isPreviewableImage,
} from './planner-shell-utils';

export function DocumentsModule({
  activeTab,
  documentKindFilter,
  documentSearchTerm,
  documentSelectionErrors,
  documentSelectionSummary,
  documentSort,
  documentStatusFilter,
  documentStatusOptions,
  documentUploadProgress,
  isDocumentDropActive,
  selectedDocumentFiles,
  visibleDocuments,
  totalDocumentCount,
  onClearSelectedDocumentFiles,
  onDocumentDragLeave,
  onDocumentDragOver,
  onDocumentDrop,
  onDocumentInputChange,
  onDocumentKindFilterChange,
  onDocumentSearchTermChange,
  onDocumentSortChange,
  onDocumentStatusFilterChange,
  onOpenDocumentPreview,
  onRemoveSelectedDocumentFile,
  onStartDocumentEdit,
  onDeleteDocument,
  onSubmit,
}: {
  activeTab: string;
  documentKindFilter: DocumentFilterKind;
  documentSearchTerm: string;
  documentSelectionErrors: string[];
  documentSelectionSummary: string;
  documentSort: DocumentSortOption;
  documentStatusFilter: string;
  documentStatusOptions: string[];
  documentUploadProgress: { completed: number; total: number; currentName: string } | null;
  isDocumentDropActive: boolean;
  selectedDocumentFiles: File[];
  visibleDocuments: PlannerState['documents'];
  totalDocumentCount: number;
  onClearSelectedDocumentFiles: () => void;
  onDocumentDragLeave: (event: DragEvent<HTMLLabelElement>) => void;
  onDocumentDragOver: (event: DragEvent<HTMLLabelElement>) => void;
  onDocumentDrop: (event: DragEvent<HTMLLabelElement>) => void;
  onDocumentInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDocumentKindFilterChange: (value: DocumentFilterKind) => void;
  onDocumentSearchTermChange: (value: string) => void;
  onDocumentSortChange: (value: DocumentSortOption) => void;
  onDocumentStatusFilterChange: (value: string) => void;
  onOpenDocumentPreview: (document: DocumentItem) => void;
  onRemoveSelectedDocumentFile: (file: File) => void;
  onStartDocumentEdit: (document: DocumentItem) => void;
  onDeleteDocument: (document: DocumentItem) => Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <section className={activeTab === 'documents' ? 'module is-visible' : 'module'}>
      {documentSelectionErrors.length > 0 ? (
        <div
          className="auth-feedback auth-error module-feedback module-feedback-compact"
          aria-live="polite"
          title={documentSelectionSummary}
        >
          <strong>Dateiauswahl prüfen</strong>
          <p className="document-error-preview">{documentSelectionSummary}</p>
        </div>
      ) : null}
      <div className="module-layout document-module-layout">
        <form className="panel form-panel document-form-panel" onSubmit={(event) => void onSubmit(event)}>
          <h4>Dokument erfassen</h4>
          <div className="document-form-grid">
            <input name="name" placeholder="Dokument" />
            <input name="category" placeholder="Kategorie" />
            <input name="status" placeholder="Status" />
            <input name="linkUrl" type="url" placeholder="Link zum Dokument (optional)" />
          </div>
          <label
            className={isDocumentDropActive ? 'file-input-label is-drag-active' : 'file-input-label'}
            onDrop={onDocumentDrop}
            onDragOver={onDocumentDragOver}
            onDragLeave={onDocumentDragLeave}
          >
            <span>Datei hochladen (optional)</span>
            <small>
              PDF, Bilder, Word-Dateien oder mehrere Dateien hier hineinziehen. Maximal
              erlaubt sind 15 MB pro Datei.
            </small>
            <input
              name="file"
              type="file"
              accept="application/pdf,image/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              onChange={onDocumentInputChange}
            />
          </label>
          {selectedDocumentFiles.length > 0 ? (
            <div className="selected-file-list">
              <div className="selected-file-summary">
                <strong>{selectedDocumentFiles.length} Datei(en) ausgewählt</strong>
                <button type="button" className="secondary-action" onClick={onClearSelectedDocumentFiles}>
                  Auswahl leeren
                </button>
              </div>
              {selectedDocumentFiles.map((file) => (
                <div key={`${file.name}-${file.size}`} className="selected-file-card">
                  <div>
                    <strong>{file.name}</strong>
                    <small>{Math.max(1, Math.round(file.size / 1024))} KB</small>
                  </div>
                  <button
                    type="button"
                    className="secondary-action selected-file-remove"
                    onClick={() => onRemoveSelectedDocumentFile(file)}
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {documentUploadProgress ? (
            <div className="upload-progress-card" aria-live="polite">
              <strong>
                Upload {documentUploadProgress.completed + 1} von {documentUploadProgress.total}
              </strong>
              <small>{documentUploadProgress.currentName}</small>
              <div className="upload-progress-bar" aria-hidden="true">
                <span
                  style={{
                    width: `${Math.max(
                      8,
                      Math.round((documentUploadProgress.completed / documentUploadProgress.total) * 100),
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
          <button type="submit">Dokument speichern</button>
        </form>
        <article className="panel list-panel">
          <div className="document-toolbar">
            <div className="document-toolbar-copy">
              <strong>{visibleDocuments.length} Dokumente sichtbar</strong>
              <small>{totalDocumentCount} insgesamt</small>
            </div>
            <div className="document-filter-grid">
              <input
                aria-label="Dokumente suchen"
                placeholder="Dokumente suchen"
                value={documentSearchTerm}
                onChange={(event) => onDocumentSearchTermChange(event.currentTarget.value)}
              />
              <select
                aria-label="Dokumentstatus filtern"
                value={documentStatusFilter}
                onChange={(event) => onDocumentStatusFilterChange(event.currentTarget.value)}
              >
                <option value="all">Alle Status</option>
                {documentStatusOptions.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
              <select
                aria-label="Dokumenttyp filtern"
                value={documentKindFilter}
                onChange={(event) => onDocumentKindFilterChange(event.currentTarget.value as DocumentFilterKind)}
              >
                {DOCUMENT_KIND_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Dokumente sortieren"
                value={documentSort}
                onChange={(event) => onDocumentSortChange(event.currentTarget.value as DocumentSortOption)}
              >
                {DOCUMENT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ul className="document-list document-grid">
            {visibleDocuments.length > 0 ? (
              visibleDocuments.map((document) => (
                <li key={document.id}>
                  <div>
                    <div className="document-entry-head">
                      {isPreviewableImage(document) ? (
                        <img className="document-preview" src={document.linkUrl} alt={`Vorschau für ${document.name}`} />
                      ) : (
                        <span className="document-icon" aria-hidden="true">
                          {getDocumentIcon(document)}
                        </span>
                      )}
                      <div className="document-entry-copy">
                        <strong>{document.name}</strong>
                        <small className="document-meta-line">
                          {getDocumentMetaParts(document).map((part, index) => (
                            <span key={part.key} className={`document-meta-part document-meta-part-${part.tone}`}>
                              {index > 0 ? <span className="document-meta-separator"> · </span> : null}
                              <span>{part.value}</span>
                            </span>
                          ))}
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="document-actions">
                    {document.linkUrl ? (
                      <a className="secondary-action document-action-button document-link-button document-open-button" href={document.linkUrl} target="_blank" rel="noreferrer">
                        {document.filePath ? 'Datei öffnen' : 'Link öffnen'}
                      </a>
                    ) : null}
                    {canPreviewDocument(document) && document.linkUrl ? (
                      <button
                        type="button"
                        className="secondary-action document-action-button document-preview-button"
                        aria-label={`Dokument ${document.name} in Vorschau öffnen`}
                        onClick={() => onOpenDocumentPreview(document)}
                      >
                        Vorschau
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="secondary-action document-action-button document-edit-button"
                      aria-label={`Dokument ${document.name} bearbeiten`}
                      onClick={() => onStartDocumentEdit(document)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      className="secondary-action document-delete-button"
                      aria-label={`Dokument ${document.name} löschen`}
                      onClick={() => void onDeleteDocument(document)}
                    >
                      Löschen
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <li className="document-empty-state">
                <div>
                  <strong>Keine Dokumente gefunden</strong>
                  <small>Prüfe Suche, Filter oder lege ein neues Dokument an.</small>
                </div>
              </li>
            )}
          </ul>
        </article>
      </div>
    </section>
  );
}