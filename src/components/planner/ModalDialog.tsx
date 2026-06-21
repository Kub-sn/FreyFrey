import type { ReactNode } from 'react';
import { AppDialogShell } from '../ui/AppDialogShell';
import { cn } from '../../lib/classnames';

export function ModalDialog({
  actions,
  children,
  className,
  eyebrow,
  hideTitle = false,
  id,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  hideTitle?: boolean;
  id: string;
  title: string;
}) {
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