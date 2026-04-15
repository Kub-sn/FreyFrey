import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { plannerFixture } from './planner-test-fixtures';
import { NotesModule } from './NotesModule';

describe('NotesModule', () => {
  it('renders notes and submits the note form', async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn().mockResolvedValue(undefined);

    render(<NotesModule activeTab="notes" notes={plannerFixture.notes} onAddNote={onAddNote} />);

    expect(document.querySelector('.notes-module-layout')).toBeInTheDocument();
    expect(document.querySelector('.notes-form-panel')).toBeInTheDocument();
    expect(screen.getByText('Hinweis')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Kategorie')).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Titel'), 'Neu');
    await user.type(screen.getByPlaceholderText('Inhalt'), 'Turnbeutel mitnehmen');
    await user.click(screen.getByRole('button', { name: 'Notiz speichern' }));

    expect(onAddNote).toHaveBeenCalled();
  });
});