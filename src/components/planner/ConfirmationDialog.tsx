import type { ReactNode } from 'react';
import { ModalDialog } from './ModalDialog';

export function ConfirmationDialog({
  actions,
  children,
  heading,
  id,
}: {
  actions: ReactNode;
  children: ReactNode;
  heading: string;
  id: string;
}) {
  return (
    <ModalDialog id={id} title={heading} actions={actions}>
      {children}
    </ModalDialog>
  );
}