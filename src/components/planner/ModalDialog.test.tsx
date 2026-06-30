import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModalDialog } from './ModalDialog';

describe('ModalDialog', () => {
  it('renders a back button that triggers onClose when onClose is provided', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <ModalDialog id="demo-title" title="Demo" onClose={onClose}>
        <p>Inhalt</p>
      </ModalDialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Demo' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const backButton = screen.getByRole('button', { name: 'Zurück' });
    await user.click(backButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render a back button when onClose is omitted', () => {
    render(
      <ModalDialog id="confirm-title" title="Bist du sicher?">
        <p>Inhalt</p>
      </ModalDialog>,
    );

    expect(screen.getByRole('dialog', { name: 'Bist du sicher?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zurück' })).not.toBeInTheDocument();
  });
});
