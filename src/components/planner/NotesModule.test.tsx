import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActiveTabProvider } from '../../context/ActiveTabContext';
import { plannerFixture } from './planner-test-fixtures';
import { NotesModule } from './NotesModule';

describe('NotesModule', () => {
  it('renders notes, opens a note, deletes a note, and submits the note form', async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn().mockResolvedValue(true);
    const onDeleteNote = vi.fn().mockResolvedValue(undefined);
    const onOpenNote = vi.fn();

    render(
      <ActiveTabProvider activeTab="notes" setActiveTab={vi.fn()}>
        <NotesModule
          notes={plannerFixture.notes}
          onAddNote={onAddNote}
          onDeleteNote={onDeleteNote}
          onOpenNote={onOpenNote}
        />
      </ActiveTabProvider>,
    );

    expect(document.querySelector('.module-layout')).toBeInTheDocument();
    expect(document.querySelector('.form-panel')).toBeInTheDocument();
    expect(screen.getByText('Hinweis')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Kategorie')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Notiz Hinweis öffnen' }));
    await user.click(screen.getByRole('button', { name: 'Notiz Hinweis löschen' }));
    await user.type(screen.getByPlaceholderText('Titel'), 'Neu');
    await user.type(screen.getByPlaceholderText('Inhalt'), 'Turnbeutel mitnehmen');
    await user.click(screen.getByRole('button', { name: 'Notiz speichern' }));

    expect(onOpenNote).toHaveBeenCalledWith('note-1');
    expect(onDeleteNote).toHaveBeenCalledWith('note-1');
    expect(onAddNote).toHaveBeenCalled();
  });

  it('shows a validation message when content is empty and skips onAddNote', async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn().mockResolvedValue(true);

    render(
      <ActiveTabProvider activeTab="notes" setActiveTab={vi.fn()}>
        <NotesModule
          notes={[]}
          onAddNote={onAddNote}
          onDeleteNote={vi.fn().mockResolvedValue(undefined)}
          onOpenNote={vi.fn()}
        />
      </ActiveTabProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Notiz speichern' }));

    expect(onAddNote).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Inhalt ist erforderlich.');
  });

  it('saves a note when only the content is filled (title is optional)', async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn().mockResolvedValue(true);

    render(
      <ActiveTabProvider activeTab="notes" setActiveTab={vi.fn()}>
        <NotesModule
          notes={[]}
          onAddNote={onAddNote}
          onDeleteNote={vi.fn().mockResolvedValue(undefined)}
          onOpenNote={vi.fn()}
        />
      </ActiveTabProvider>,
    );

    await user.type(screen.getByPlaceholderText('Inhalt'), 'Nur Inhalt');
    await user.click(screen.getByRole('button', { name: 'Notiz speichern' }));

    expect(onAddNote).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});