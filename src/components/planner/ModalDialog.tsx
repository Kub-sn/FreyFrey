import type { ReactNode } from 'react';

export function ModalDialog({
  actions,
  children,
  className,
  eyebrow,
  id,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  id: string;
  title: string;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className={className ? `modal-card ${className}` : 'modal-card'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <div className="panel-heading">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h3 id={id}>{title}</h3>
          </div>
        </div>
        {children}
        {actions ? <div className="modal-actions">{actions}</div> : null}
      </section>
    </div>
  );
}