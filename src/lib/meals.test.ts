import { describe, expect, it } from 'vitest';
import { getMealCalendarDays, resolveLegacyMealDate } from './meals';

describe('getMealCalendarDays', () => {
  it('returns the current week from monday to sunday', () => {
    expect(getMealCalendarDays('week', new Date('2026-06-03T12:00:00'))).toEqual([
      { date: '2026-06-01', isCurrentPeriod: true, isToday: false },
      { date: '2026-06-02', isCurrentPeriod: true, isToday: false },
      { date: '2026-06-03', isCurrentPeriod: true, isToday: true },
      { date: '2026-06-04', isCurrentPeriod: true, isToday: false },
      { date: '2026-06-05', isCurrentPeriod: true, isToday: false },
      { date: '2026-06-06', isCurrentPeriod: true, isToday: false },
      { date: '2026-06-07', isCurrentPeriod: true, isToday: false },
    ]);
  });

  it('returns the current and next week for the two-week view', () => {
    const days = getMealCalendarDays('two-weeks', new Date('2026-06-03T12:00:00'));

    expect(days).toHaveLength(14);
    expect(days[0]).toEqual({ date: '2026-06-01', isCurrentPeriod: true, isToday: false });
    expect(days[13]).toEqual({ date: '2026-06-14', isCurrentPeriod: true, isToday: false });
  });

  it('pads the month view to full calendar weeks', () => {
    const days = getMealCalendarDays('month', new Date('2026-05-15T12:00:00'));

    expect(days[0]).toEqual({ date: '2026-04-27', isCurrentPeriod: false, isToday: false });
    expect(days[days.length - 1]).toEqual({ date: '2026-05-31', isCurrentPeriod: true, isToday: false });
  });
});

describe('resolveLegacyMealDate', () => {
  it('maps german weekday labels onto the current week', () => {
    expect(resolveLegacyMealDate('Dienstag', new Date('2026-06-03T12:00:00'))).toBe('2026-06-02');
  });

  it('keeps iso dates unchanged', () => {
    expect(resolveLegacyMealDate('2026-06-10', new Date('2026-06-03T12:00:00'))).toBe('2026-06-10');
  });
});