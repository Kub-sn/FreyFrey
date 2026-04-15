import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NoteDialog } from './NoteDialog';

describe('NoteDialog', () => {
  it('renders full note text and forwards the edit action', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <NoteDialog
        note={{
          id: 'note-1',
          title: 'Ferienplanung',
          text: 'Sehr langer kompletter Text der Notiz.',
          isEditing: false,
        }}
        onClose={onClose}
        onEdit={onEdit}
        onFieldChange={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.getByText('Sehr langer kompletter Text der Notiz.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(onEdit).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('updates fields and saves in edit mode', async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <NoteDialog
        note={{
          id: 'note-1',
          title: 'Ferienplanung',
          text: 'Sehr langer kompletter Text der Notiz.',
          isEditing: true,
        }}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onFieldChange={onFieldChange}
        onSave={onSave}
      />,
    );

    await user.type(screen.getByLabelText('Notiztitel bearbeiten'), ' Update');
    await user.type(screen.getByLabelText('Notizinhalt bearbeiten'), ' Mehr');
    await user.click(screen.getByRole('button', { name: 'Änderungen speichern' }));

    expect(onFieldChange).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
  });
});