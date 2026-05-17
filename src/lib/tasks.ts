import type { TaskItem, TaskStatus, TaskSubtask } from './planner-data';

const TASK_DUE_DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function isTaskDone(task: Pick<TaskItem, 'status'>) {
  return task.status === 'done';
}

export function getTaskSubtaskProgress(subtasks: TaskSubtask[]) {
  const completed = subtasks.filter((subtask) => subtask.done).length;
  return {
    completed,
    total: subtasks.length,
  };
}

function parseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getTaskDueState(due: string, referenceDate = new Date()): 'normal' | 'soon' | 'overdue' | 'unknown' {
  const dueDate = parseLocalDate(due);
  if (!dueDate) {
    return 'unknown';
  }

  const diffMs = startOfDay(dueDate).getTime() - startOfDay(referenceDate).getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays <= 0) {
    return 'overdue';
  }

  if (diffDays <= 3) {
    return 'soon';
  }

  return 'normal';
}

export function formatTaskDueLabel(due: string) {
  const dueDate = parseLocalDate(due);
  if (!dueDate) {
    return due;
  }

  return TASK_DUE_DATE_FORMATTER.format(dueDate);
}

export function getTaskStatusLabel(status: TaskStatus) {
  if (status === 'in-progress') {
    return 'In Arbeit';
  }

  if (status === 'done') {
    return 'Erledigt';
  }

  return 'Todo';
}