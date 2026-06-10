import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NoteDialog } from './NoteDialog';

function getRichTextEditor(container: ParentNode) {
  const editor = Array.from(container.querySelectorAll('[role="textbox"]')).find((element) => element.classList.contains('note-rich-text-surface'));
  if (!editor) {
    throw new Error('Rich text editor not found');
  }

  return editor as HTMLElement;
}

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

    expect(screen.getByLabelText('Notiztitel bearbeiten').closest('form')).toHaveClass('dialog-form');

    await user.type(screen.getByLabelText('Notiztitel bearbeiten'), ' Update');
    const editor = getRichTextEditor(document.body);
    editor.innerHTML = '<div>Sehr langer kompletter Text der Notiz. Mehr</div>';
    fireEvent.input(editor);
    await user.click(screen.getByRole('button', { name: 'Änderungen speichern' }));

    expect(onFieldChange).toHaveBeenCalled();
    expect(onFieldChange).toHaveBeenCalledWith('text', expect.stringContaining('Sehr langer kompletter Text der Notiz. Mehr'));
    expect(onSave).toHaveBeenCalled();
  });

  it('renders formatted rich text safely in read mode', () => {
    render(
      <NoteDialog
        note={{
          id: 'note-1',
          title: 'Ferienplanung',
          text: '<div data-note-rich-text="true"><div><strong>Wichtig</strong></div><ul data-list-type="checklist"><li data-checked="true">Turnbeutel</li></ul></div>',
          isEditing: false,
        }}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Wichtig')).toBeInTheDocument();
    expect(screen.getByText('Turnbeutel')).toBeInTheDocument();
    expect(document.querySelector('.note-rich-text-content strong')).toHaveTextContent('Wichtig');
    expect(document.querySelector('.note-rich-text-content li[data-checked="true"]')).toHaveTextContent('Turnbeutel');
  });
});