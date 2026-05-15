import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActiveTabProvider } from '../../context/ActiveTabContext';
import { plannerFixture } from './planner-test-fixtures';
import { TasksModule } from './TasksModule';

describe('TasksModule', () => {
  it('uses equal-height task columns with a desktop minimum height', () => {
    render(
      <ActiveTabProvider activeTab="tasks" setActiveTab={vi.fn()}>
        <TasksModule
          familyMemberOptions={plannerFixture.members.map((member) => member.name)}
          ownerDefaultValue="Alex"
          tasks={plannerFixture.tasks}
          onAddTask={vi.fn().mockResolvedValue(undefined)}
          onUpdateTask={vi.fn().mockResolvedValue(undefined)}
          onDeleteTask={vi.fn().mockResolvedValue(undefined)}
          onSetTaskStatus={vi.fn().mockResolvedValue(undefined)}
          onToggleTaskSubtask={vi.fn().mockResolvedValue(undefined)}
        />
      </ActiveTabProvider>,
    );

    const createButton = screen.getByRole('button', { name: 'Todo hinzufügen' });
    const moduleStack = createButton.closest('div')?.parentElement;
    const todoHeading = screen.getByRole('heading', { level: 4, name: 'Todo' });
    const todoColumn = screen.getByRole('heading', { level: 4, name: 'Todo' }).closest('article');

    expect(moduleStack).toHaveClass('content-start', 'gap-4');
    expect(todoHeading).toHaveClass('text-[1.34rem]', 'font-semibold');
    expect(todoColumn).toHaveClass('xl:h-full', 'xl:min-h-[26rem]', 'xl:flex', 'xl:flex-col');
    expect(todoColumn).not.toHaveClass('self-start');
  });

  it('renders kanban columns, submits the form, changes status via dialog, and toggles a subtask', async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn().mockResolvedValue(undefined);
    const onUpdateTask = vi.fn().mockResolvedValue(undefined);
    const onDeleteTask = vi.fn().mockResolvedValue(undefined);
    const onSetTaskStatus = vi.fn().mockResolvedValue(undefined);
    const onToggleTaskSubtask = vi.fn().mockResolvedValue(undefined);

    render(
      <ActiveTabProvider activeTab="tasks" setActiveTab={vi.fn()}>
        <TasksModule
          familyMemberOptions={plannerFixture.members.map((member) => member.name)}
          ownerDefaultValue="Alex"
          tasks={plannerFixture.tasks}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onSetTaskStatus={onSetTaskStatus}
          onToggleTaskSubtask={onToggleTaskSubtask}
        />
      </ActiveTabProvider>,
    );

    expect(screen.getByRole('heading', { level: 4, name: 'Todo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'In Arbeit' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Erledigt' })).toBeInTheDocument();
    expect(screen.getByText('1/2 erledigt')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Hefte sortieren' })).not.toHaveClass('app-switch');
    const createButton = screen.getByRole('button', { name: 'Todo hinzufügen' });
    expect(createButton).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Todo' }).closest('article')).not.toContainElement(createButton);

    await user.click(createButton);

    const createDialog = screen.getByRole('dialog', { name: 'Neue Aufgabe' });
    expect(within(createDialog).getByRole('combobox', { name: 'Verantwortlich' })).toBeInTheDocument();
    expect(within(createDialog).queryByText('Kanban')).not.toBeInTheDocument();

    await user.type(within(createDialog).getByPlaceholderText('Aufgabe'), 'Muell rausbringen');
    await user.selectOptions(within(createDialog).getByRole('combobox', { name: 'Verantwortlich' }), 'Bea User');
    await user.type(within(createDialog).getByLabelText('Fälligkeitsdatum'), '2026-05-04');
    await user.click(within(createDialog).getByRole('button', { name: 'Subtask hinzufügen' }));
    await user.type(within(createDialog).getByLabelText('Subtask 1'), 'Muellsack verknoten');
    await user.click(within(createDialog).getByRole('button', { name: 'Aufgabe speichern' }));

    await user.click(screen.getByRole('button', { name: /Aufgabe Schultasche packen Aktionen/i }));
    await user.click(screen.getByRole('button', { name: 'Status ändern' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Status ändern' })).getByRole('button', { name: /In Arbeit/i }));
    await user.click(screen.getByRole('checkbox', { name: 'Turnbeutel prüfen' }));

    expect(onAddTask).toHaveBeenCalledWith({
      title: 'Muell rausbringen',
      owner: 'Bea User',
      due: '2026-05-04',
      subtasks: [{ id: expect.any(String), title: 'Muellsack verknoten', done: false }],
    });
    expect(onUpdateTask).not.toHaveBeenCalled();
    expect(onDeleteTask).not.toHaveBeenCalled();
    expect(onSetTaskStatus).toHaveBeenCalledWith('task-1', 'in-progress');
    expect(onToggleTaskSubtask).toHaveBeenCalledWith('task-1', 'task-1-subtask-2', true);
  });

  it('shows animated drag feedback on the drop target column without highlighting the hovered task card', () => {
    const dataTransfer = {
      effectAllowed: 'move',
      setData: vi.fn(),
      getData: vi.fn().mockReturnValue('task-1'),
    };

    render(
      <ActiveTabProvider activeTab="tasks" setActiveTab={vi.fn()}>
        <TasksModule
          familyMemberOptions={plannerFixture.members.map((member) => member.name)}
          ownerDefaultValue="Alex"
          tasks={[
            ...plannerFixture.tasks,
            {
              id: 'task-2',
              title: 'Brotdose prüfen',
              owner: 'Bea',
              due: '2026-05-05',
              status: 'in-progress',
              subtasks: [],
            },
          ]}
          onAddTask={vi.fn().mockResolvedValue(undefined)}
          onUpdateTask={vi.fn().mockResolvedValue(undefined)}
          onDeleteTask={vi.fn().mockResolvedValue(undefined)}
          onSetTaskStatus={vi.fn().mockResolvedValue(undefined)}
          onToggleTaskSubtask={vi.fn().mockResolvedValue(undefined)}
        />
      </ActiveTabProvider>,
    );

    const sourceTask = screen.getByText('Schultasche packen').closest('article');
    const targetTask = screen.getByText('Brotdose prüfen').closest('article');
    const targetColumn = screen.getByRole('heading', { level: 4, name: 'In Arbeit' }).closest('article');

    if (!sourceTask || !targetTask || !targetColumn) {
      throw new Error('Drag-and-drop test targets were not found.');
    }

    fireEvent.dragStart(sourceTask, { dataTransfer });
    fireEvent.dragOver(targetTask, { dataTransfer });

    expect(screen.getByText('Loslassen zum Verschieben')).toBeInTheDocument();
    expect(targetColumn).toHaveClass('-translate-y-1');
    expect(targetColumn).toHaveAttribute('data-drop-active', 'true');
    expect(targetTask).not.toHaveClass('-translate-y-1');
    expect(screen.queryByText('Hier ablegen')).not.toBeInTheDocument();
  });

  it('hides subtask progress and fallback text for tasks without subtasks', () => {
    render(
      <ActiveTabProvider activeTab="tasks" setActiveTab={vi.fn()}>
        <TasksModule
          familyMemberOptions={plannerFixture.members.map((member) => member.name)}
          ownerDefaultValue="Alex"
          tasks={[
            ...plannerFixture.tasks,
            {
              id: 'task-2',
              title: 'Muell rausbringen',
              owner: 'Bea',
              due: '2026-05-05',
              status: 'todo',
              subtasks: [],
            },
          ]}
          onAddTask={vi.fn().mockResolvedValue(undefined)}
          onUpdateTask={vi.fn().mockResolvedValue(undefined)}
          onDeleteTask={vi.fn().mockResolvedValue(undefined)}
          onSetTaskStatus={vi.fn().mockResolvedValue(undefined)}
          onToggleTaskSubtask={vi.fn().mockResolvedValue(undefined)}
        />
      </ActiveTabProvider>,
    );

    expect(screen.queryByText('Keine Subtasks hinterlegt.')).not.toBeInTheDocument();
    expect(screen.queryByText('0/0 erledigt')).not.toBeInTheDocument();
    expect(screen.queryAllByText('Todo')).toHaveLength(1);
  });

  it('edits and deletes a task through the action menu', async () => {
    const user = userEvent.setup();
    const onUpdateTask = vi.fn().mockResolvedValue(true);
    const onDeleteTask = vi.fn().mockResolvedValue(true);

    render(
      <ActiveTabProvider activeTab="tasks" setActiveTab={vi.fn()}>
        <TasksModule
          familyMemberOptions={plannerFixture.members.map((member) => member.name)}
          ownerDefaultValue="Alex"
          tasks={plannerFixture.tasks}
          onAddTask={vi.fn().mockResolvedValue(undefined)}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onSetTaskStatus={vi.fn().mockResolvedValue(undefined)}
          onToggleTaskSubtask={vi.fn().mockResolvedValue(undefined)}
        />
      </ActiveTabProvider>,
    );

    await user.click(screen.getByRole('button', { name: /Aufgabe Schultasche packen Aktionen/i }));
    expect(screen.getByRole('heading', { level: 4, name: 'Todo' }).closest('article')).toHaveClass('z-20');
    expect(screen.getByRole('button', { name: 'Status ändern' }).parentElement).toHaveClass('z-40');
    await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));

    const editDialog = screen.getByRole('dialog', { name: 'Aufgabe bearbeiten' });
    expect(within(editDialog).getByPlaceholderText('Aufgabe').closest('form')).toHaveClass('dialog-form');
    await user.clear(within(editDialog).getByPlaceholderText('Aufgabe'));
    await user.type(within(editDialog).getByPlaceholderText('Aufgabe'), 'Schultasche neu packen');
    await user.click(within(editDialog).getByRole('button', { name: 'Änderungen speichern' }));

    expect(onUpdateTask).toHaveBeenCalledWith('task-1', {
      title: 'Schultasche neu packen',
      owner: 'Alex',
      due: '2026-05-02',
      status: 'todo',
      subtasks: [
        { id: 'task-1-subtask-1', title: 'Hefte sortieren', done: true },
        { id: 'task-1-subtask-2', title: 'Turnbeutel prüfen', done: false },
      ],
    });

    await user.click(screen.getByRole('button', { name: /Aufgabe Schultasche packen Aktionen/i }));
    await user.click(screen.getByRole('button', { name: 'Löschen' }));
    expect(screen.getByRole('button', { name: /^Löschen$/ })).toHaveClass('secondary-action', 'danger-action');
    await user.click(screen.getByRole('button', { name: /^Löschen$/ }));

    expect(onDeleteTask).toHaveBeenCalledWith('task-1');
  });

  it('keeps the create dialog open when saving fails', async () => {
    const user = userEvent.setup();

    render(
      <ActiveTabProvider activeTab="tasks" setActiveTab={vi.fn()}>
        <TasksModule
          familyMemberOptions={plannerFixture.members.map((member) => member.name)}
          ownerDefaultValue="Alex"
          tasks={plannerFixture.tasks}
          onAddTask={vi.fn().mockResolvedValue(false)}
          onUpdateTask={vi.fn().mockResolvedValue(true)}
          onDeleteTask={vi.fn().mockResolvedValue(true)}
          onSetTaskStatus={vi.fn().mockResolvedValue(undefined)}
          onToggleTaskSubtask={vi.fn().mockResolvedValue(undefined)}
        />
      </ActiveTabProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Todo hinzufügen' }));

    const createDialog = screen.getByRole('dialog', { name: 'Neue Aufgabe' });
    await user.type(within(createDialog).getByPlaceholderText('Aufgabe'), 'Fehlversuch');
    await user.type(within(createDialog).getByLabelText('Fälligkeitsdatum'), '2026-05-04');
    await user.click(within(createDialog).getByRole('button', { name: 'Aufgabe speichern' }));

    expect(screen.getByRole('dialog', { name: 'Neue Aufgabe' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Fehlversuch')).toBeInTheDocument();
  });

  it('keeps the edit dialog open when saving fails', async () => {
    const user = userEvent.setup();

    render(
      <ActiveTabProvider activeTab="tasks" setActiveTab={vi.fn()}>
        <TasksModule
          familyMemberOptions={plannerFixture.members.map((member) => member.name)}
          ownerDefaultValue="Alex"
          tasks={plannerFixture.tasks}
          onAddTask={vi.fn().mockResolvedValue(true)}
          onUpdateTask={vi.fn().mockResolvedValue(false)}
          onDeleteTask={vi.fn().mockResolvedValue(true)}
          onSetTaskStatus={vi.fn().mockResolvedValue(undefined)}
          onToggleTaskSubtask={vi.fn().mockResolvedValue(undefined)}
        />
      </ActiveTabProvider>,
    );

    await user.click(screen.getByRole('button', { name: /Aufgabe Schultasche packen Aktionen/i }));
    await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));

    const editDialog = screen.getByRole('dialog', { name: 'Aufgabe bearbeiten' });
    await user.clear(within(editDialog).getByPlaceholderText('Aufgabe'));
    await user.type(within(editDialog).getByPlaceholderText('Aufgabe'), 'Bleibt offen');
    await user.click(within(editDialog).getByRole('button', { name: 'Änderungen speichern' }));

    expect(screen.getByRole('dialog', { name: 'Aufgabe bearbeiten' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bleibt offen')).toBeInTheDocument();
  });
});