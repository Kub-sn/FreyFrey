import type { ReactNode } from 'react';
import { cn } from '../../lib/classnames';

const fullScreenMobileClassName =
  'max-mobile:!w-full max-mobile:!max-h-none max-mobile:!h-[100dvh] max-mobile:!overflow-hidden max-mobile:!rounded-none max-mobile:!border-0 max-mobile:!bg-[#fffaf4] max-mobile:!p-0 max-mobile:!shadow-none';

export function AppDialogShell({
  children,
  className,
  fullScreenOnMobile = false,
  id,
}: {
  children: ReactNode;
  className?: string;
  fullScreenOnMobile?: boolean;
  id: string;
}) {
  return (
    <section
      className={cn(
        'app-dialog-shell dialog-surface modal-box w-[min(560px,100%)] max-w-none min-w-0 max-h-[min(88vh,1000px)] overflow-auto rounded-[28px] border border-[rgba(24,52,47,0.1)] bg-[rgba(255,250,244,0.97)] p-5 text-[#18342f] shadow-[0_28px_70px_rgba(24,52,47,0.22)]',
        fullScreenOnMobile && fullScreenMobileClassName,
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