import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlannerState } from '../../lib/planner-data';
import { ActiveTabProvider } from '../../context/ActiveTabContext';
import { plannerFixture } from './planner-test-fixtures';
import { PlannerOverview } from './PlannerOverview';

describe('PlannerOverview', () => {
  it('renders todo previews and toggles todo items', async () => {
    const user = userEvent.setup();
    const onToggleTodoItem = vi.fn().mockResolvedValue(undefined);
    const plannerState: PlannerState = {
      ...plannerFixture,
      todoLists: [
        ...plannerFixture.todoLists,
        {
          id: 'todo-list-2',
          title: 'Haushalt',
          items: [
            { id: 'todo-3', title: 'Brotdose einpacken', checked: false },
            { id: 'todo-4', title: 'Bastelsachen ordnen', checked: true },
          ],
        },
      ],
    };

    render(
      <ActiveTabProvider activeTab="overview" setActiveTab={vi.fn()}>
        <PlannerOverview
          openTasks={1}
          plannerState={plannerState}
          onToggleTodoItem={onToggleTodoItem}
        />
      </ActiveTabProvider>,
    );

    expect(screen.getByText('Turnbeutel prüfen')).toBeInTheDocument();
    expect(screen.getByText('Brotdose einpacken')).toBeInTheDocument();
    expect(screen.queryByText('Bastelsachen ordnen')).not.toBeInTheDocument();
    await user.click(within(screen.getByText('Turnbeutel prüfen').closest('li') as HTMLElement).getByRole('button', { name: 'Erledigen' }));
    expect(onToggleTodoItem).toHaveBeenCalledWith('todo-list-1', 'todo-2', true);
  });
});
