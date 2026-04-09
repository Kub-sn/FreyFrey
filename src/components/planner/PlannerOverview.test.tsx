import { render, screen } from '@testing-library/react';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlannerState } from '../../lib/planner-data';
import { plannerFixture } from './planner-test-fixtures';
import { PlannerOverview } from './PlannerOverview';

describe('PlannerOverview', () => {
  it('renders task and calendar previews and toggles tasks', async () => {
    const user = userEvent.setup();
    const onToggleTask = vi.fn().mockResolvedValue(undefined);
    const plannerState: PlannerState = {
      ...plannerFixture,
      tasks: [
        ...plannerFixture.tasks,
        { id: 'task-2', title: 'Brotdose einpacken', owner: 'Bea', due: 'Morgen', done: false },
        { id: 'task-3', title: 'Elternbrief lesen', owner: 'Alex', due: 'Freitag', done: false },
        { id: 'task-4', title: 'Turnbeutel prüfen', owner: 'Bea', due: 'Samstag', done: false },
        { id: 'task-5', title: 'Bastelsachen ordnen', owner: 'Alex', due: 'Sonntag', done: false },
        { id: 'task-6', title: 'Hausaufgabenmappe prüfen', owner: 'Bea', due: 'Montag', done: false },
      ],
      calendar: [
        ...plannerFixture.calendar,
        { id: 'calendar-2', title: 'Elternabend', date: '2026-04-10', time: '19:00', place: 'Aula' },
        { id: 'calendar-3', title: 'Sportfest', date: '2026-04-11', time: '10:00', place: 'Sportplatz' },
        { id: 'calendar-4', title: 'Zahnarzt', date: '2026-04-12', time: '08:30', place: 'Praxis' },
        { id: 'calendar-5', title: 'Schwimmkurs', date: '2026-04-13', time: '16:00', place: 'Hallenbad' },
        { id: 'calendar-6', title: 'Klassenfest', date: '2026-04-14', time: '14:00', place: 'Schulhof' },
      ],
    };

    render(
      <PlannerOverview
        activeTab="overview"
        openTasks={1}
        plannerState={plannerState}
        sortedCalendarEntries={plannerState.calendar}
        onToggleTask={onToggleTask}
      />,
    );

    expect(screen.getByText('Schultasche packen')).toBeInTheDocument();
    expect(screen.getByText('Hausaufgabenmappe prüfen')).toBeInTheDocument();
    expect(screen.getByText('Laternenfest')).toBeInTheDocument();
    expect(screen.getByText('Klassenfest')).toBeInTheDocument();
    await user.click(within(screen.getByText('Schultasche packen').closest('li') as HTMLElement).getByRole('button', { name: 'Offen' }));
    expect(onToggleTask).toHaveBeenCalledWith('task-1', true);
  });
});