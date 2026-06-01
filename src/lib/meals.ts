export type MealCalendarView = 'week' | 'two-weeks' | 'month';

export type MealCalendarDay = {
  date: string;
  isCurrentPeriod: boolean;
  isToday: boolean;
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const weekdayOffsets: Record<string, number> = {
  monday: 0,
  montag: 0,
  tuesday: 1,
  dienstag: 1,
  wednesday: 2,
  mittwoch: 2,
  thursday: 3,
  donnerstag: 3,
  friday: 4,
  freitag: 4,
  saturday: 5,
  samstag: 5,
  sunday: 6,
  sonntag: 6,
};

function createLocalDate(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  return createLocalDate(year, month - 1, day);
}

export function isDateKey(value: string) {
  return DATE_KEY_PATTERN.test(value);
}

export function startOfWeek(referenceDate: Date) {
  const date = createLocalDate(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const currentWeekday = date.getDay();
  const offset = currentWeekday === 0 ? -6 : 1 - currentWeekday;

  date.setDate(date.getDate() + offset);

  return date;
}

export function addDays(referenceDate: Date, days: number) {
  const date = createLocalDate(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );

  date.setDate(date.getDate() + days);

  return date;
}

export function getMealCalendarDays(view: MealCalendarView, referenceDate = new Date()): MealCalendarDay[] {
  const todayKey = toDateKey(referenceDate);

  if (view === 'week') {
    const start = startOfWeek(referenceDate);

    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      const dateKey = toDateKey(date);

      return {
        date: dateKey,
        isCurrentPeriod: true,
        isToday: dateKey === todayKey,
      };
    });
  }

  if (view === 'two-weeks') {
    const start = startOfWeek(referenceDate);

    return Array.from({ length: 14 }, (_, index) => {
      const date = addDays(start, index);
      const dateKey = toDateKey(date);

      return {
        date: dateKey,
        isCurrentPeriod: true,
        isToday: dateKey === todayKey,
      };
    });
  }

  const monthStart = createLocalDate(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const monthEnd = createLocalDate(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  const gridStart = startOfWeek(monthStart);
  const monthEndWeekday = monthEnd.getDay() === 0 ? 6 : monthEnd.getDay() - 1;
  const gridEnd = addDays(monthEnd, 6 - monthEndWeekday);
  const dayCount = Math.round((gridEnd.getTime() - gridStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  return Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(gridStart, index);
    const dateKey = toDateKey(date);

    return {
      date: dateKey,
      isCurrentPeriod: date.getMonth() === referenceDate.getMonth(),
      isToday: dateKey === todayKey,
    };
  });
}

export function resolveLegacyMealDate(day: string, referenceDate = new Date()) {
  const normalizedDay = day.trim().toLowerCase();

  if (isDateKey(normalizedDay)) {
    return normalizedDay;
  }

  const weekdayOffset = weekdayOffsets[normalizedDay];

  if (weekdayOffset === undefined) {
    return toDateKey(referenceDate);
  }

  return toDateKey(addDays(startOfWeek(referenceDate), weekdayOffset));
}