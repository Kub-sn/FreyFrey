import type { ReactNode } from 'react';
import { ModalDialog } from './ModalDialog';

export function ConfirmationDialog({
  actions,
  children,
  heading,
  hideHeading = false,
  id,
}: {
  actions: ReactNode;
  children: ReactNode;
  heading: string;
  hideHeading?: boolean;
  id: string;
}) {
  return (
    <ModalDialog id={id} title={heading} hideTitle={hideHeading} actions={actions}>
      {children}
    </ModalDialog>
  );
}