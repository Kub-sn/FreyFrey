import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ActiveTabProvider } from '../../context/ActiveTabContext';
import type { TodoList } from '../../lib/planner-data';
import { plannerFixture } from './planner-test-fixtures';
import { TasksModule } from './TasksModule';

function renderTasksModule(overrides: Partial<ComponentProps<typeof TasksModule>> = {}) {
  const props: ComponentProps<typeof TasksModule> = {
    lists: plannerFixture.todoLists,
    onCreateList: vi.fn().mockResolvedValue({ id: 'todo-list-created', title: 'Todo Liste 1', items: [] }),
    onUpdateList: vi.fn().mockResolvedValue(true),
    onDeleteList: vi.fn().mockResolvedValue(true),
    onCreateItem: vi.fn().mockResolvedValue({ id: 'todo-created', title: 'Muell rausbringen', checked: false }),
    onToggleItem: vi.fn().mockResolvedValue(undefined),
    onDeleteItem: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  render(
    <ActiveTabProvider activeTab="tasks" setActiveTab={vi.fn()}>
      <TasksModule {...props} />
    </ActiveTabProvider>,
  );

  return props;
}

function StatefulTasksModule({
  initialLists,
  onCreateList,
}: {
  initialLists: TodoList[];
  onCreateList: (payload: Omit<TodoList, 'id'>) => Promise<TodoList | null>;
}) {
  const [lists, setLists] = useState(initialLists);

  const handleCreateList = async (payload: Omit<TodoList, 'id'>) => {
    const createdList = await onCreateList(payload);

    if (createdList) {
      setLists((current) => [createdList, ...current]);
    }

    return createdList;
  };

  return (
    <ActiveTabProvider activeTab="tasks" setActiveTab={vi.fn()}>
      <TasksModule
        lists={lists}
        onCreateList={handleCreateList}
        onUpdateList={vi.fn().mockResolvedValue(true)}
        onDeleteList={vi.fn().mockResolvedValue(true)}
        onCreateItem={vi.fn().mockResolvedValue({ id: 'todo-created', title: 'Muell rausbringen', checked: false })}
        onToggleItem={vi.fn().mockResolvedValue(undefined)}
        onDeleteItem={vi.fn().mockResolvedValue(undefined)}
      />
    </ActiveTabProvider>
  );
}

describe('TasksModule', () => {
  it('creates a default-named todo list and opens it for fast entry', async () => {
    const user = userEvent.setup();
    const onCreateList = vi.fn().mockResolvedValue({ id: 'todo-list-created', title: 'Todo Liste 1', items: [] });

    render(<StatefulTasksModule initialLists={[]} onCreateList={onCreateList} />);

    await user.click(screen.getByRole('button', { name: 'Liste erstellen' }));

  const createDialog = screen.getByRole('dialog', { name: 'Neue Todo-Liste' });
  await user.click(within(createDialog).getByRole('button', { name: 'Liste erstellen' }));

    expect(onCreateList).toHaveBeenCalledWith({ title: 'Todo Liste 1', items: [] });
    expect(await screen.findByRole('dialog', { name: 'Todo Liste 1' })).toBeInTheDocument();
    expect(screen.queryByText('Neues Todo')).not.toBeInTheDocument();
    expect(screen.queryByText('Ohne Datum')).not.toBeInTheDocument();
    expect(screen.queryByText('Noch keine To-dos erfasst. Tippe oben etwas ein und drücke Enter.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Todo hinzufügen')).toHaveFocus();
  });

  it('creates a todo list with a custom name and optional date', async () => {
    const user = userEvent.setup();
    const onCreateList = vi.fn().mockResolvedValue({
      id: 'todo-list-created',
      title: 'Wochenende',
      date: '2026-05-04',
      items: [],
    });

    render(<StatefulTasksModule initialLists={[]} onCreateList={onCreateList} />);

    await user.click(screen.getByRole('button', { name: 'Liste erstellen' }));

    const createDialog = screen.getByRole('dialog', { name: 'Neue Todo-Liste' });
    await user.type(within(createDialog).getByLabelText('Listenname'), 'Wochenende');
    fireEvent.change(within(createDialog).getByLabelText('Fristdatum (optional)'), { target: { value: '2026-05-04' } });
    await user.click(within(createDialog).getByRole('button', { name: 'Liste erstellen' }));

    expect(onCreateList).toHaveBeenCalledWith({
      title: 'Wochenende',
      date: '2026-05-04',
      items: [],
    });
    expect(await screen.findByRole('dialog', { name: 'Wochenende' })).toBeInTheDocument();
  });

  it('increments default todo list names like shopping lists', async () => {
    const user = userEvent.setup();
    const onCreateList = vi.fn().mockResolvedValue({ id: 'todo-list-created', title: 'Todo Liste 2', items: [] });
    const lists: TodoList[] = [
      { id: 'todo-list-existing', title: 'Todo Liste 1', items: [] },
    ];

    renderTasksModule({ lists, onCreateList });

    await user.click(screen.getByRole('button', { name: 'Liste erstellen' }));

    const createDialog = screen.getByRole('dialog', { name: 'Neue Todo-Liste' });
    await user.click(within(createDialog).getByRole('button', { name: 'Liste erstellen' }));

    expect(onCreateList).toHaveBeenCalledWith({ title: 'Todo Liste 2', items: [] });
  });

  it('adds todo items with Enter and keeps the quick-add input focused', async () => {
    const user = userEvent.setup();
    const onCreateItem = vi.fn().mockResolvedValue({ id: 'todo-created', title: 'Muell rausbringen', checked: false });

    renderTasksModule({ onCreateItem });

    await user.click(screen.getByRole('button', { name: 'Todo-Liste Schule öffnen' }));
    const dialog = screen.getByRole('dialog', { name: 'Schule' });
    const quickAddInput = within(dialog).getByLabelText('Todo hinzufügen');

    await user.type(quickAddInput, 'Muell   rausbringen{Enter}');

    expect(onCreateItem).toHaveBeenCalledWith('todo-list-1', 'Muell rausbringen');
    expect(quickAddInput).toHaveValue('');
    expect(quickAddInput).toHaveFocus();
  });

  it('keeps the date read-only in the open dialog and updates it only in edit mode', async () => {
    const user = userEvent.setup();
    const onUpdateList = vi.fn().mockResolvedValue(true);
    const onToggleItem = vi.fn().mockResolvedValue(undefined);

    renderTasksModule({ onUpdateList, onToggleItem });

    await user.click(screen.getByRole('button', { name: 'Todo-Liste Schule öffnen' }));
    expect(screen.queryByLabelText('Fristdatum')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Schließen' }));

    await user.click(screen.getByRole('button', { name: /Todo-Liste Schule Aktionen/i }));
    await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));

    const editDialog = screen.getByRole('dialog', { name: 'Todo-Liste bearbeiten' });
    await user.clear(within(editDialog).getByDisplayValue('Schule'));
    await user.type(within(editDialog).getByPlaceholderText('z. B. Wochenende'), 'Wochenende');
    fireEvent.change(within(editDialog).getByLabelText('Fristdatum (optional)'), { target: { value: '' } });
    await user.click(within(editDialog).getByRole('button', { name: 'Liste speichern' }));

    expect(onUpdateList).toHaveBeenCalledTimes(1);
    expect(onUpdateList).toHaveBeenCalledWith('todo-list-1', {
      title: 'Wochenende',
      items: plannerFixture.todoLists[0].items,
    });

    await user.click(screen.getByRole('button', { name: 'Todo-Liste Schule öffnen' }));
    await user.click(screen.getByRole('checkbox', { name: 'Turnbeutel prüfen' }));

    expect(onToggleItem).toHaveBeenCalledWith('todo-list-1', 'todo-2', true);
  });

  it('deletes todo items and whole todo lists', async () => {
    const user = userEvent.setup();
    const onDeleteItem = vi.fn().mockResolvedValue(undefined);
    const onDeleteList = vi.fn().mockResolvedValue(true);

    renderTasksModule({ onDeleteItem, onDeleteList });

    await user.click(screen.getByRole('button', { name: 'Todo-Liste Schule öffnen' }));
    await user.click(screen.getByRole('button', { name: 'Todo Turnbeutel prüfen löschen' }));

    expect(onDeleteItem).toHaveBeenCalledWith('todo-list-1', 'todo-2');

    await user.click(screen.getByRole('button', { name: 'Schließen' }));
    await user.click(screen.getByRole('button', { name: /Todo-Liste Schule Aktionen/i }));
    await user.click(screen.getByRole('button', { name: 'Löschen' }));
    const deleteDialog = screen.getByRole('dialog', { name: 'Todo-Liste löschen?' });
    const hiddenHeading = within(deleteDialog).getByRole('heading', { name: 'Todo-Liste löschen?' });

    expect(hiddenHeading).toHaveClass('sr-only');
    expect(within(deleteDialog).getByText('Schule')).toHaveClass('font-bold');
    expect(within(deleteDialog).getByText('Liste').closest('p')).toHaveClass('whitespace-nowrap');

    await user.click(within(deleteDialog).getByRole('button', { name: 'Löschen' }));

    expect(onDeleteList).toHaveBeenCalledWith('todo-list-1');
  });

  it('opens a todo list when clicking the card itself', async () => {
    const user = userEvent.setup();

    renderTasksModule();

    await user.click(screen.getByTestId('todo-list-open-surface-todo-list-1'));

    expect(screen.getByRole('dialog', { name: 'Schule' })).toBeInTheDocument();
  });
});
