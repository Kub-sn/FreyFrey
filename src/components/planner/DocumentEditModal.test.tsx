import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { documentEditFixture } from './planner-test-fixtures';
import { DocumentEditModal } from './DocumentEditModal';

describe('DocumentEditModal', () => {
  it('updates fields, saves, and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onFieldChange = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <DocumentEditModal
        documentEditState={documentEditFixture}
        onClose={onClose}
        onFieldChange={onFieldChange}
        onSave={onSave}
      />,
    );

    await user.type(screen.getByLabelText('Dokumentname bearbeiten'), ' X');
    await user.click(screen.getByRole('button', { name: 'Änderungen speichern' }));
    await user.click(screen.getByRole('button', { name: 'Schließen' }));

    expect(onFieldChange).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});