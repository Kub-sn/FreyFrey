import { useEffect } from 'react';
import type { ToastItem } from '../../app/types';

const TOAST_LIFETIME_MS = 5000;

function NotificationToast({
  id,
  message,
  tone,
  onDismiss,
}: ToastItem & {
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDismiss(id);
    }, TOAST_LIFETIME_MS);

    return () => window.clearTimeout(timeoutId);
  }, [id, onDismiss]);

  return (
    <li className={`toast toast-${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">
      <p>{message}</p>
      <button
        type="button"
        className="toast-close"
        aria-label="Hinweis schliessen"
        onClick={() => onDismiss(id)}
      >
        X
      </button>
    </li>
  );
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      <ol className="toast-stack">
        {toasts.map((toast) => (
          <NotificationToast key={toast.id} {...toast} onDismiss={onDismiss} />
        ))}
      </ol>
    </div>
  );
}