import type { ReactNode } from 'react';
import { cn } from '../../lib/classnames';

export function AppDialogShell({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id: string;
}) {
  return (
    <section
      className={cn(
        'app-dialog-shell dialog-surface modal-box w-[min(560px,100%)] max-w-none min-w-0 max-h-[min(88vh,1000px)] overflow-auto rounded-[28px] border border-[rgba(24,52,47,0.1)] bg-[rgba(255,250,244,0.97)] p-5 text-[#18342f] shadow-[0_28px_70px_rgba(24,52,47,0.22)]',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={id}
    >
      {children}
    </section>
  );
}