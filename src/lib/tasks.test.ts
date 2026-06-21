import { describe, expect, it } from 'vitest';
import { formatTodoListDate } from './tasks';

describe('todo helpers', () => {
  it('formats optional todo list dates for display', () => {
    expect(formatTodoListDate(undefined)).toBe('Ohne Datum');
    expect(formatTodoListDate('2026-04-29')).toBe('29.04.2026');
    expect(formatTodoListDate('Heute')).toBe('Heute');
  });
});
