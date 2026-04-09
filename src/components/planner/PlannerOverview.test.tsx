import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { plannerFixture } from './planner-test-fixtures';
import { PlannerOverview } from './PlannerOverview';

describe('PlannerOverview', () => {
  it('renders task and calendar previews and toggles tasks', async () => {
    const user = userEvent.setup();
    const onToggleTask = vi.fn().mockResolvedValue(undefined);

    render(
      <PlannerOverview
        activeTab="overview"
        openTasks={1}
        plannerState={plannerFixture}
        sortedCalendarEntries={plannerFixture.calendar}
        onToggleTask={onToggleTask}
      />,
    );

    expect(screen.getByText('Schultasche packen')).toBeInTheDocument();
    expect(screen.getByText('Laternenfest')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Offen' }));
    expect(onToggleTask).toHaveBeenCalledWith('task-1', true);
  });
});