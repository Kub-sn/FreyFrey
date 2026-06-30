import type { ReactNode } from 'react';
import { StepBack } from 'lucide-react';
import { AppDialogShell } from '../ui/AppDialogShell';
import { AppButton } from '../ui/AppButton';
import { cn } from '../../lib/classnames';

export function ModalDialog({
  actions,
  children,
  className,
  eyebrow,
  hideTitle = false,
  id,
  onClose,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  hideTitle?: boolean;
  id: string;
  onClose?: () => void;
  title: string;
}) {
  const fullScreenOnMobile = Boolean(onClose);

  if (!fullScreenOnMobile) {
    return (
      <div className="modal modal-open fixed inset-0 z-40 !grid place-items-center bg-[rgba(24,52,47,0.5)] p-6 backdrop-blur-[10px]" role="presentation">
        <AppDialogShell id={id} className={`grid gap-4 ${className ?? ''}`}>
          <div className="block min-w-0">
            <div className="w-auto min-w-0">
              {eyebrow ? <p className="m-0 uppercase tracking-[0.18em] text-[0.72rem] opacity-75">{eyebrow}</p> : null}
              <h3 id={id} className={cn('break-words', hideTitle ? 'sr-only' : undefined)}>{title}</h3>
            </div>
          </div>
          {children}
          {actions ? <div className="dialog-actions flex flex-wrap justify-end gap-3">{actions}</div> : null}
        </AppDialogShell>
      </div>
    );
  }

  return (
    <div
      className="modal modal-open fixed inset-0 z-40 !grid place-items-center bg-[rgba(24,52,47,0.5)] p-6 backdrop-blur-[10px] max-mobile:!place-items-stretch max-mobile:!bg-transparent max-mobile:!p-0 max-mobile:!backdrop-blur-none"
      role="presentation"
    >
      <AppDialogShell
        id={id}
        fullScreenOnMobile
        className={cn('grid gap-4 max-mobile:flex max-mobile:flex-col max-mobile:gap-0', className)}
      >
        <div className="block min-w-0 max-mobile:sticky max-mobile:top-0 max-mobile:z-10 max-mobile:border-b max-mobile:border-[rgba(24,52,47,0.1)] max-mobile:bg-[#fffaf4] max-mobile:px-4 max-mobile:py-3">
          <div className="w-auto min-w-0">
            {eyebrow ? <p className="m-0 uppercase tracking-[0.18em] text-[0.72rem] opacity-75 max-mobile:hidden">{eyebrow}</p> : null}
            <h3 id={id} className={cn('break-words max-mobile:truncate max-mobile:text-base', hideTitle ? 'sr-only' : undefined)}>{title}</h3>
          </div>
        </div>
        <div className="min-w-0 max-mobile:flex-1 max-mobile:overflow-y-auto max-mobile:overflow-x-hidden max-mobile:px-4 max-mobile:py-4">
          {children}
        </div>
        <div className="dialog-actions flex flex-wrap justify-end gap-3 max-mobile:sticky max-mobile:bottom-0 max-mobile:z-10 max-mobile:flex-nowrap max-mobile:items-center max-mobile:justify-between max-mobile:border-t max-mobile:border-[rgba(24,52,47,0.1)] max-mobile:bg-[#fffaf4] max-mobile:px-4 max-mobile:py-3">
          <AppButton
            type="button"
            variant="secondary"
            className="hidden shrink-0 items-center gap-1.5 max-mobile:inline-flex [&_svg]:size-4"
            onClick={onClose}
          >
            <StepBack aria-hidden="true" />
            Zurück
          </AppButton>
          {actions}
        </div>
      </AppDialogShell>
    </div>
  );
}