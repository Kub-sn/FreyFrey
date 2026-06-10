import type { DocumentFilterKind, DocumentSortOption } from '../../app/types';
import type { PlannerState } from '../../lib/planner-data';
import type { AuthState, CloudSyncSetterValue } from '../../app/types';
import {
  canPreviewDocument,
  DOCUMENT_KIND_FILTER_OPTIONS,
  DOCUMENT_SORT_OPTIONS,
  getDocumentIcon,
  getDocumentMetaParts,
  isPreviewableImage,
} from './planner-shell-utils';
import { useActiveTab } from '../../context/ActiveTabContext';
import { useDocumentManager } from '../../hooks/useDocumentManager';
import { AppButton, AppButtonLink } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { appInputClassName, appSelectClassName } from '../ui/AppField';
import { ConfirmationDialog } from './ConfirmationDialog';
import { DocumentEditModal } from './DocumentEditModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';

export function DocumentsModule({
  authState,
  plannerState,
  setCloudSync,
  updateState,
}: {
  authState: AuthState;
  plannerState: PlannerState;
  setCloudSync: (value: CloudSyncSetterValue) => void;
  updateState: (updater: (current: PlannerState) => PlannerState) => void;
}) {
  const { activeTab } = useActiveTab();

  const documents = useDocumentManager({
    authState,
    plannerState,
    setCloudSync,
    updateState,
    activeTab,
  });
  return (
    <section className={activeTab === 'documents' ? 'module is-visible' : 'module'}>
      {documents.documentSelectionErrors.length > 0 ? (
        <div
          className="auth-feedback auth-error mb-4 max-mobile:shadow-[0_10px_24px_rgba(70,54,31,0.08)] grid gap-[0.18rem]"
          aria-live="polite"
          title={documents.documentSelectionSummary}
        >
          <strong className="overflow-hidden whitespace-nowrap text-ellipsis">Dateiauswahl prüfen</strong>
          <p className="overflow-hidden whitespace-nowrap text-ellipsis m-0">{documents.documentSelectionSummary}</p>
        </div>
      ) : null}
      <div className="module-layout document-module-layout">
        <AppCard as="form" className="form-panel document-form-panel gap-[0.8rem] p-[1.15rem] max-mobile:p-[0.8rem]" onSubmit={(event) => void documents.handleAddDocument(event)}>
          <h4>Dokument erfassen</h4>
          <label
            className={`file-input-label grid gap-[0.65rem] font-semibold min-h-[8.5rem] content-start justify-items-start p-[1.3rem] border border-dashed border-[rgba(24,52,47,0.24)] rounded-[18px] bg-[rgba(246,239,226,0.5)] transition-[border-color,background,transform] duration-[140ms] ease-out hover:border-[rgba(185,95,44,0.42)] hover:bg-[rgba(255,247,239,0.72)] hover:-translate-y-px${documents.isDocumentDropActive ? ' is-drag-active !border-[#19624d] !bg-[rgba(25,98,77,0.12)] !-translate-y-px' : ''}`}
            onDrop={documents.handleDocumentDrop}
            onDragOver={documents.handleDocumentDragOver}
            onDragLeave={documents.handleDocumentDragLeave}
          >
            <span className="text-base">Datei hochladen</span>
            <small className="text-[rgba(24,52,47,0.72)] max-compact:text-[#4c564d]">
              PDF, Bilder, Word-Dateien oder mehrere Dateien hier hineinziehen. Maximal
              erlaubt sind 15 MB pro Datei.
            </small>
            <input
              name="file"
              type="file"
              accept="application/pdf,image/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              onChange={documents.handleDocumentInputChange}
            />
          </label>
          {documents.selectedDocumentFiles.length > 0 ? (
            <div className="grid gap-3">
              <div className="selected-file-summary flex justify-between items-center gap-4 py-[0.9rem] px-4 rounded-[18px] bg-[rgba(24,52,47,0.08)]">
                <strong>{documents.selectedDocumentFiles.length} Datei(en) ausgewählt</strong>
                <AppButton type="button" variant="secondary" onClick={documents.handleClearSelectedDocumentFiles}>
                  Auswahl leeren
                </AppButton>
              </div>
              {documents.selectedDocumentFiles.map((file) => (
                <div key={`${file.name}-${file.size}`} className="selected-file-card flex justify-between items-center gap-4 py-[0.9rem] px-4 rounded-[18px] bg-[rgba(24,52,47,0.08)]">
                  <div>
                    <strong className="block">{file.name}</strong>
                    <small className="block">{Math.max(1, Math.round(file.size / 1024))} KB</small>
                  </div>
                  <AppButton
                    type="button"
                    variant="secondary"
                    className="py-[0.65rem] px-[0.9rem]"
                    onClick={() => documents.handleRemoveSelectedDocumentFile(file)}
                  >
                    Entfernen
                  </AppButton>
                </div>
              ))}
            </div>
          ) : null}
          {documents.documentUploadProgress ? (
            <div className="upload-progress-card grid py-[0.9rem] px-4 rounded-[18px] bg-[rgba(24,52,47,0.08)]" aria-live="polite">
              <strong className="block">
                Upload {documents.documentUploadProgress.completed + 1} von {documents.documentUploadProgress.total}
              </strong>
              <small className="block">{documents.documentUploadProgress.currentName}</small>
              <div className="w-full h-[0.55rem] rounded-full overflow-hidden bg-[rgba(24,52,47,0.12)]" aria-hidden="true">
                <span
                  className="block h-full rounded-[inherit] bg-[linear-gradient(90deg,#19624d,#f46f3a)] transition-[width] duration-[180ms] ease-out max-compact:bg-[#a6b29f]"
                  style={{
                    width: `${Math.max(
                      8,
                      Math.round((documents.documentUploadProgress.completed / documents.documentUploadProgress.total) * 100),
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
          <AppButton type="submit" variant="primary">Dokument speichern</AppButton>
        </AppCard>
        <AppCard className="self-start">
          <div className="document-toolbar grid gap-4 mb-4">
            <div className="document-toolbar-copy flex justify-between items-center gap-4 [&>strong]:block [&>small]:block max-compact:flex-col max-compact:items-start max-compact:gap-1">
              <strong>{documents.visibleDocuments.length} {documents.visibleDocuments.length === 1 ? 'Dokument' : 'Dokumente'} sichtbar</strong>
              <small>{plannerState.documents.length} insgesamt</small>
            </div>
            <div className="document-filter-grid">
              <input
                className={appInputClassName()}
                aria-label="Dokumente suchen"
                placeholder="Dokumente suchen"
                value={documents.documentSearchTerm}
                onChange={(event) => documents.setDocumentSearchTerm(event.currentTarget.value)}
              />
              <select
                className={appSelectClassName()}
                aria-label="Dokumenttyp filtern"
                value={documents.documentKindFilter}
                onChange={(event) => documents.setDocumentKindFilter(event.currentTarget.value as DocumentFilterKind)}
              >
                {DOCUMENT_KIND_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className={appSelectClassName()}
                aria-label="Dokumente sortieren"
                value={documents.documentSort}
                onChange={(event) => documents.setDocumentSort(event.currentTarget.value as DocumentSortOption)}
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
            {documents.visibleDocuments.length > 0 ? (
              documents.visibleDocuments.map((document) => (
                <li key={document.id}>
                  <div>
                    <div className="flex items-center gap-[0.9rem]">
                      {isPreviewableImage(document) ? (
                        <img className="document-preview size-12 rounded-[14px] shrink-0 object-cover border border-[rgba(24,52,47,0.12)] bg-[rgba(255,255,255,0.92)]" src={document.url} alt={`Vorschau für ${document.name}`} />
                      ) : (
                        <span className="document-icon inline-flex size-12 items-center justify-center rounded-[14px] shrink-0 bg-[rgba(24,52,47,0.1)] text-[#18342f] text-[0.78rem] font-bold" aria-hidden="true">
                          {getDocumentIcon(document)}
                        </span>
                      )}
                      <div className="grid gap-[0.2rem]">
                        <strong className="block">{document.name}</strong>
                        <small className="inline-flex flex-wrap gap-0 items-center text-[rgba(24,52,47,0.68)] max-compact:text-[#4c564d]">
                          {getDocumentMetaParts(document).map((part, index) => (
                            <span key={part.key}>
                              {index > 0 ? <span className="text-[rgba(24,52,47,0.42)] max-compact:text-[rgba(29,36,31,0.62)]"> · </span> : null}
                              <span>{part.value}</span>
                            </span>
                          ))}
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="w-full grid grid-cols-[repeat(2,minmax(0,1fr))] justify-items-stretch items-stretch gap-[0.6rem]">
                    {document.url ? (
                      <AppButtonLink variant="primary" className="w-full inline-flex items-center justify-center no-underline order-1 max-compact:[grid-column:1]" href={document.url} target="_blank" rel="noreferrer">
                        Datei öffnen
                      </AppButtonLink>
                    ) : null}
                    {canPreviewDocument(document) && document.url ? (
                      <AppButton
                        type="button"
                        variant="primary"
                        className="w-full order-2 max-compact:[grid-column:2]"
                        aria-label={`Dokument ${document.name} in Vorschau öffnen`}
                        onClick={() => documents.handleOpenDocumentPreview(document)}
                      >
                        Vorschau
                      </AppButton>
                    ) : null}
                    <AppButton
                      type="button"
                      variant="primary"
                      className="w-full order-3 max-compact:[grid-column:1]"
                      aria-label={`Dokument ${document.name} bearbeiten`}
                      onClick={() => documents.handleStartDocumentEdit(document)}
                    >
                      Bearbeiten
                    </AppButton>
                    <AppButton
                      type="button"
                      variant="danger"
                      className="w-full order-4 py-[0.65rem] px-[0.9rem]"
                      aria-label={`Dokument ${document.name} löschen`}
                      onClick={() => void documents.handleDeleteDocument(document)}
                    >
                      Löschen
                    </AppButton>
                  </div>
                </li>
              ))
            ) : (
              <li className="min-h-[auto] items-center !bg-transparent !border-0 !shadow-none !py-2 !px-0 max-mobile:content-center">
                <span>Keine Dokumente vorhanden</span>
              </li>
            )}
          </ul>
        </AppCard>
      </div>

      {documents.documentEditState ? (
        <DocumentEditModal
          documentEditState={documents.documentEditState}
          onClose={() => documents.setDocumentEditState(null)}
          onFieldChange={documents.handleDocumentEditFieldChange}
          onSave={documents.handleSaveDocumentEdit}
        />
      ) : null}

      {documents.documentPreviewState ? (
        <DocumentPreviewModal
          documentPreviewState={documents.documentPreviewState}
          onClose={() => documents.setDocumentPreviewState(null)}
        />
      ) : null}

      {documents.pendingDocumentDeletion ? (
        <ConfirmationDialog
          heading="Löschen?"
          id="delete-document-title"
          actions={(
            <>
              <AppButton
                type="button"
                variant="secondary"
                disabled={documents.documentDeletionBusy}
                onClick={() => documents.setPendingDocumentDeletion(null)}
              >
                Abbrechen
              </AppButton>
              <AppButton
                type="button"
                variant="danger"
                disabled={documents.documentDeletionBusy}
                onClick={() => void documents.handleConfirmDocumentDeletion()}
              >
                {documents.documentDeletionBusy ? 'Lösche…' : 'Löschen'}
              </AppButton>
            </>
          )}
        >
          <p className="m-0 py-[0.9rem] px-4 rounded-[18px] bg-[rgba(165,71,34,0.12)] text-[#8f3415] leading-relaxed">
            Dokument {documents.pendingDocumentDeletion.name} löschen?
          </p>
        </ConfirmationDialog>
      ) : null}
    </section>
  );
}