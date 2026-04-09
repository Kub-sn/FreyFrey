import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConfirmationDialog } from './ConfirmationDialog';

describe('ConfirmationDialog', () => {
  it('renders heading, body, and actions', () => {
    render(
      <ConfirmationDialog heading="Bist du sicher?" id="confirm-title" actions={<button type="button">Bestätigen</button>}>
        <p>Dies ist endgültig.</p>
      </ConfirmationDialog>,
    );

    expect(screen.getByRole('dialog', { name: 'Bist du sicher?' })).toBeInTheDocument();
    expect(screen.getByText('Dies ist endgültig.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bestätigen' })).toBeInTheDocument();
  });
});