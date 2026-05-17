import type { CalendarItem } from './planner-data';

export type CalendarDayCell = {
  date: Date;
  dateKey: string;
  dayNumber: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  entries: CalendarItem[];
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;
const CALENDAR_MONTH_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  month: 'long',
  year: 'numeric',
});
const CALENDAR_DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const CALENDAR_ENTRY_DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: 'short',
});

export const CALENDAR_WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

export function toCalendarDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseCalendarDateKey(value: string) {
  const normalizedValue = value.trim();
  const match = ISO_DATE_PATTERN.exec(normalizedValue);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return parsedDate;
}

export function getCalendarEntryDateTime(entry: CalendarItem) {
  const structuredDate = parseCalendarDateKey(entry.date);

  if (structuredDate) {
    const timeMatch = TIME_PATTERN.exec(entry.time.trim());

    if (!timeMatch) {
      return structuredDate;
    }

    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const parsedDate = new Date(structuredDate);
    parsedDate.setHours(hours, minutes, 0, 0);
    return parsedDate;
  }

  const fallbackDate = new Date(entry.date);
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
}

export function getCalendarEntryDateKey(entry: CalendarItem) {
  const structuredDate = parseCalendarDateKey(entry.date);

  if (structuredDate) {
    return toCalendarDateKey(structuredDate);
  }

  const parsedDate = getCalendarEntryDateTime(entry);
  return parsedDate ? toCalendarDateKey(parsedDate) : null;
}

export function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function sortCalendarEntries(entries: CalendarItem[]) {
  return [...entries].sort((left, right) => {
    const leftDate = getCalendarEntryDateTime(left);
    const rightDate = getCalendarEntryDateTime(right);

    if (leftDate && rightDate) {
      const difference = leftDate.getTime() - rightDate.getTime();

      if (difference !== 0) {
        return difference;
      }
    } else if (leftDate) {
      return -1;
    } else if (rightDate) {
      return 1;
    }

    return left.title.localeCompare(right.title, 'de', { sensitivity: 'base' });
  });
}

export function buildCalendarMonth(
  referenceDate: Date,
  entries: CalendarItem[],
  selectedDateKey: string,
) {
  const monthStart = getMonthStart(referenceDate);
  const monthStartDay = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -monthStartDay);
  const todayKey = toCalendarDateKey(new Date());
  const scheduledEntriesByDay = new Map<string, CalendarItem[]>();

  for (const entry of sortCalendarEntries(entries)) {
    const dateKey = getCalendarEntryDateKey(entry);

    if (!dateKey) {
      continue;
    }

    const currentEntries = scheduledEntriesByDay.get(dateKey) ?? [];
    currentEntries.push(entry);
    scheduledEntriesByDay.set(dateKey, currentEntries);
  }

  const cells: CalendarDayCell[] = Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const dateKey = toCalendarDateKey(date);

    return {
      date,
      dateKey,
      dayNumber: String(date.getDate()),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isToday: dateKey === todayKey,
      isSelected: dateKey === selectedDateKey,
      entries: scheduledEntriesByDay.get(dateKey) ?? [],
    };
  });

  return Array.from({ length: 6 }, (_, weekIndex) => cells.slice(weekIndex * 7, weekIndex * 7 + 7));
}

export function formatCalendarMonthLabel(date: Date) {
  return CALENDAR_MONTH_FORMATTER.format(date);
}

export function formatCalendarDateLabel(value: string | Date) {
  const parsedDate = typeof value === 'string' ? parseCalendarDateKey(value) : value;

  if (!parsedDate) {
    return typeof value === 'string' ? value : '';
  }

  return CALENDAR_DATE_FORMATTER.format(parsedDate);
}

export function formatCalendarEntrySchedule(entry: CalendarItem) {
  const structuredDate = parseCalendarDateKey(entry.date);

  if (!structuredDate) {
    return [entry.date.trim(), entry.time.trim()].filter(Boolean).join(' · ');
  }

  const dateLabel = CALENDAR_ENTRY_DATE_FORMATTER.format(structuredDate);
  return [dateLabel, entry.time.trim()].filter(Boolean).join(' · ');
}

export function getCalendarDayButtonLabel(date: Date, entriesCount: number) {
  const label = CALENDAR_DATE_FORMATTER.format(date);

  if (entriesCount === 0) {
    return `${label}, keine Termine`;
  }

  return `${label}, ${entriesCount} Termin${entriesCount === 1 ? '' : 'e'}`;
}
