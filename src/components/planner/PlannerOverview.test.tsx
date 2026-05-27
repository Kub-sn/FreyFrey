import { render, screen } from '@testing-library/react';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlannerState } from '../../lib/planner-data';
import { ActiveTabProvider } from '../../context/ActiveTabContext';
import { plannerFixture } from './planner-test-fixtures';
import { PlannerOverview } from './PlannerOverview';

describe('PlannerOverview', () => {
  it('renders task previews and toggles tasks', async () => {
    const user = userEvent.setup();
    const onToggleTask = vi.fn().mockResolvedValue(undefined);
    const plannerState: PlannerState = {
      ...plannerFixture,
      tasks: [
        ...plannerFixture.tasks,
        { id: 'task-2', title: 'Brotdose einpacken', owner: 'Bea', due: '2026-05-03', status: 'todo', subtasks: [] },
        { id: 'task-3', title: 'Elternbrief lesen', owner: 'Alex', due: '2026-05-04', status: 'in-progress', subtasks: [] },
        { id: 'task-4', title: 'Turnbeutel prüfen', owner: 'Bea', due: '2026-05-05', status: 'todo', subtasks: [] },
        { id: 'task-5', title: 'Bastelsachen ordnen', owner: 'Alex', due: '2026-05-06', status: 'done', subtasks: [] },
        { id: 'task-6', title: 'Hausaufgabenmappe prüfen', owner: 'Bea', due: '2026-05-07', status: 'todo', subtasks: [] },
      ],
    };

    render(
      <ActiveTabProvider activeTab="overview" setActiveTab={vi.fn()}>
        <PlannerOverview
          openTasks={1}
          plannerState={plannerState}
          onToggleTask={onToggleTask}
        />
      </ActiveTabProvider>,
    );

    expect(screen.getByText('Schultasche packen')).toBeInTheDocument();
    expect(screen.getByText('Hausaufgabenmappe prüfen')).toBeInTheDocument();
    expect(screen.queryByText('Bastelsachen ordnen')).not.toBeInTheDocument();
    await user.click(within(screen.getByText('Schultasche packen').closest('li') as HTMLElement).getByRole('button', { name: 'Erledigen' }));
    expect(onToggleTask).toHaveBeenCalledWith('task-1', true);
  });
});