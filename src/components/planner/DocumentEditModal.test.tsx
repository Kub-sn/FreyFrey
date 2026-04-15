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
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(onFieldChange).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('omits the storage-link note for uploaded files and keeps the dialog editable', async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();

    render(
      <DocumentEditModal
        documentEditState={{
          ...documentEditFixture,
          filePath: 'documents/certificate.pdf',
          linkUrl: 'https://storage.example.com/certificate.pdf',
          name: 'certificate_of_completion_react_certificate_of_completion_react',
        }}
        onClose={vi.fn()}
        onFieldChange={onFieldChange}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(
      screen.queryByText('Datei-Uploads behalten ihren Storage-Link. Nur die Metadaten werden geändert.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Dokumentlink bearbeiten')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Dokumentname bearbeiten'), ' X');

    expect(onFieldChange).toHaveBeenCalled();
  });
});