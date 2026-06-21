const TODO_LIST_DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatTodoListDate(date: string | undefined) {
  if (!date) {
    return 'Ohne Datum';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const parsedDate = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return TODO_LIST_DATE_FORMATTER.format(parsedDate);
}
