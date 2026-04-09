import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastViewport } from './ToastViewport';

describe('ToastViewport', () => {
  it('renders toasts and dismisses them automatically and manually', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();

    render(
      <ToastViewport
        toasts={[{ id: 'toast-1', message: 'Gespeichert', tone: 'success' }]}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText('Gespeichert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hinweis schliessen' }));
    expect(onDismiss).toHaveBeenCalledWith('toast-1');

    vi.advanceTimersByTime(5000);
    expect(onDismiss).toHaveBeenCalledWith('toast-1');
    vi.useRealTimers();
  });
});