import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlannerState } from '../../lib/planner-data';
import { ActiveTabProvider } from '../../context/ActiveTabContext';
import { plannerFixture } from './planner-test-fixtures';
import { PlannerOverview } from './PlannerOverview';

function renderOverview(plannerState: PlannerState, overrides?: {
  onToggleTodoItem?: ReturnType<typeof vi.fn>;
  onToggleShoppingItem?: ReturnType<typeof vi.fn>;
}) {
  const onToggleTodoItem = overrides?.onToggleTodoItem ?? vi.fn().mockResolvedValue(undefined);
  const onToggleShoppingItem = overrides?.onToggleShoppingItem ?? vi.fn().mockResolvedValue(undefined);

  render(
    <ActiveTabProvider activeTab="overview" setActiveTab={vi.fn()}>
      <PlannerOverview
        openTasks={1}
        pendingShopping={1}
        plannerState={plannerState}
        onToggleTodoItem={onToggleTodoItem}
        onToggleShoppingItem={onToggleShoppingItem}
      />
    </ActiveTabProvider>,
  );

  return { onToggleTodoItem, onToggleShoppingItem };
}

describe('PlannerOverview', () => {
  it('groups todos and shopping items by list and shows all items', () => {
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

    renderOverview(plannerState);

    // To-dos card: list headers and all items (including checked) are shown.
    expect(screen.getByRole('heading', { level: 4, name: 'Schule' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Haushalt' })).toBeInTheDocument();
    expect(screen.getByText('Turnbeutel prüfen')).toBeInTheDocument();
    expect(screen.getByText('Hefte sortieren')).toBeInTheDocument();
    expect(screen.getByText('Bastelsachen ordnen')).toBeInTheDocument();

    // Einkäufe card: list header and item with quantity.
    expect(screen.getByRole('heading', { level: 4, name: 'Wocheneinkauf' })).toBeInTheDocument();
    expect(screen.getByText('Milch')).toBeInTheDocument();
  });

  it('shows the date next to todo list names but not for shopping lists', () => {
    renderOverview(plannerFixture);

    const todoCard = screen.getByRole('heading', { level: 3, name: 'To-dos' }).closest('.overview-row-panel') as HTMLElement;
    const shoppingCard = screen.getByRole('heading', { level: 3, name: 'Einkäufe' }).closest('.overview-row-panel') as HTMLElement;

    expect(within(todoCard).getByText('02.05.2026')).toBeInTheDocument();
    expect(within(shoppingCard).queryByText('04.05.2026')).not.toBeInTheDocument();
  });

  it('toggles a todo item via its checkbox', async () => {
    const user = userEvent.setup();
    const { onToggleTodoItem } = renderOverview(plannerFixture);

    const item = screen.getByText('Turnbeutel prüfen').closest('li') as HTMLElement;
    await user.click(within(item).getByRole('checkbox'));

    expect(onToggleTodoItem).toHaveBeenCalledWith('todo-list-1', 'todo-2', true);
  });

  it('toggles a shopping item via its checkbox', async () => {
    const user = userEvent.setup();
    const { onToggleShoppingItem } = renderOverview(plannerFixture);

    const item = screen.getByText('Milch').closest('li') as HTMLElement;
    await user.click(within(item).getByRole('checkbox'));

    expect(onToggleShoppingItem).toHaveBeenCalledWith('shopping-list-1', 'shopping-1', true);
  });

  it('hides empty lists and shows an empty state per card', () => {
    const plannerState: PlannerState = {
      ...plannerFixture,
      todoLists: [
        { id: 'todo-list-empty', title: 'Leere Liste', date: '2026-05-02', items: [] },
      ],
      shoppingLists: [],
    };

    renderOverview(plannerState);

    expect(screen.queryByRole('heading', { level: 4, name: 'Leere Liste' })).not.toBeInTheDocument();
    expect(screen.getByText('Keine To-dos')).toBeInTheDocument();
    expect(screen.getByText('Keine Einkäufe')).toBeInTheDocument();
  });
});
