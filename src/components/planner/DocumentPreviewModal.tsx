import type { DocumentPreviewState } from '../../app/types';
import { AppButton, AppButtonLink } from '../ui/AppButton';
import { ModalDialog } from './ModalDialog';

export function DocumentPreviewModal({
  documentPreviewState,
  onClose,
}: {
  documentPreviewState: DocumentPreviewState;
  onClose: () => void;
}) {
  return (
    <ModalDialog
      id="document-preview-title"
      title={documentPreviewState.name}
      eyebrow="Dokument-Vorschau"
      className="w-[min(980px,100%)]"
      onClose={onClose}
      actions={(
        <>
          <AppButton type="button" variant="secondary" className="max-mobile:hidden" onClick={onClose}>
            Abbrechen
          </AppButton>
          <AppButtonLink variant="secondary" className="no-underline" href={documentPreviewState.url} target="_blank" rel="noreferrer">
            In neuem Tab öffnen
          </AppButtonLink>
        </>
      )}
    >
      <div className="min-h-[24rem] grid place-items-center rounded-[24px] overflow-hidden bg-[linear-gradient(135deg,rgba(24,52,47,0.08),rgba(244,111,58,0.12))] max-compact:bg-[#a6b29f]">
        {documentPreviewState.kind === 'image' ? (
          <img
            className="w-full min-h-[70vh] border-none bg-white object-contain"
            src={documentPreviewState.url}
            alt={`Vorschau für ${documentPreviewState.name}`}
          />
        ) : (
          <iframe
            className="w-full min-h-[70vh] border-none bg-white"
            src={documentPreviewState.url}
            title={`PDF-Vorschau für ${documentPreviewState.name}`}
          />
        )}
      </div>
    </ModalDialog>
  );
}