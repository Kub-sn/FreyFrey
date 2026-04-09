import type { ReactNode } from 'react';

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
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby={id}>
        <h3 id={id}>{heading}</h3>
        {children}
        <div className="modal-actions">{actions}</div>
      </section>
    </div>
  );
}