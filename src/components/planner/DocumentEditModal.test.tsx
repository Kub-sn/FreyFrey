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

    expect(screen.getByLabelText('Dokumentname bearbeiten').closest('form')).toHaveClass('dialog-form');

    await user.type(screen.getByLabelText('Dokumentname bearbeiten'), ' X');
    await user.click(screen.getByRole('button', { name: 'Änderungen speichern' }));
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(screen.getByRole('button', { name: 'Änderungen speichern' })).toHaveClass('auth-submit');
    expect(onFieldChange).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('only exposes the document name field for uploaded files', async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();

    render(
      <DocumentEditModal
        documentEditState={{
          ...documentEditFixture,
          filePath: 'documents/certificate.pdf',
          name: 'certificate_of_completion_react_certificate_of_completion_react',
        }}
        onClose={vi.fn()}
        onFieldChange={onFieldChange}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.queryByLabelText('Dokumentkategorie bearbeiten')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Dokumentlink bearbeiten')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Dokumentname bearbeiten'), ' X');

    expect(onFieldChange).toHaveBeenCalled();
  });
});