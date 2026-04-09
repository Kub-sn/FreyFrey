import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { buildCalendarMonth, getMonthStart } from '../../lib/calendar-view';
import { plannerFixture } from './planner-test-fixtures';
import { CalendarModule } from './CalendarModule';

describe('CalendarModule', () => {
  it('renders the calendar grid and forwards calendar interactions', async () => {
    const user = userEvent.setup();
    const date = new Date('2026-04-09T00:00:00.000Z');
    const calendarViewDate = getMonthStart(date);
    const calendarMonth = buildCalendarMonth(calendarViewDate, plannerFixture.calendar, '2026-04-09');
    const onSelectCalendarDate = vi.fn();
    const onChangeCalendarMonth = vi.fn();
    const onShowToday = vi.fn();

    render(
      <CalendarModule
        activeTab="calendar"
        calendarMonth={calendarMonth}
        calendarViewDate={calendarViewDate}
        selectedCalendarDate="2026-04-09"
        selectedDayEntries={plannerFixture.calendar}
        unscheduledCalendarEntries={[]}
        visibleMonthEventCount={1}
        onAddCalendar={vi.fn().mockResolvedValue(undefined)}
        onChangeCalendarMonth={onChangeCalendarMonth}
        onSelectCalendarDate={onSelectCalendarDate}
        onShowToday={onShowToday}
      />,
    );

    expect(screen.getByRole('grid', { name: 'Monatskalender' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Heute' }));
    await user.click(screen.getByRole('button', { name: 'Nächster Monat' }));
    await user.click(screen.getAllByRole('gridcell')[0]);

    expect(onShowToday).toHaveBeenCalled();
    expect(onChangeCalendarMonth).toHaveBeenCalledWith(1);
    expect(onSelectCalendarDate).toHaveBeenCalled();
  });
});