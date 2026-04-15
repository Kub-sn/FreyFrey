import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { plannerFixture } from './planner-test-fixtures';
import { NotesModule } from './NotesModule';

describe('NotesModule', () => {
  it('renders notes, opens a note, and submits the note form', async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn().mockResolvedValue(undefined);
    const onOpenNote = vi.fn();

    render(
      <NotesModule
        activeTab="notes"
        notes={plannerFixture.notes}
        onAddNote={onAddNote}
        onOpenNote={onOpenNote}
      />,
    );

    expect(document.querySelector('.notes-module-layout')).toBeInTheDocument();
    expect(document.querySelector('.notes-form-panel')).toBeInTheDocument();
    expect(screen.getByText('Hinweis')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Kategorie')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Notiz Hinweis öffnen' }));
    await user.type(screen.getByPlaceholderText('Titel'), 'Neu');
    await user.type(screen.getByPlaceholderText('Inhalt'), 'Turnbeutel mitnehmen');
    await user.click(screen.getByRole('button', { name: 'Notiz speichern' }));

    expect(onOpenNote).toHaveBeenCalledWith('note-1');
    expect(onAddNote).toHaveBeenCalled();
  });
});