import { Plus } from 'lucide-react';
import { useEffect, useState, type DragEvent, type FormEvent } from 'react';
import type { PlannerState, TaskItem, TaskStatus } from '../../lib/planner-data';
import { useActiveTab } from '../../context/ActiveTabContext';
import { validateRequiredFields, type FieldErrors } from '../../lib/form-validation';
import { nextStringId } from '../../lib/id';
import { clearUiDraft, loadUiDraft, saveUiDraft } from '../../lib/storage';
import {
  formatTaskDueLabel,
  getTaskDueState,
  getTaskStatusLabel,
  getTaskSubtaskProgress,
} from '../../lib/tasks';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { appCheckboxClassName, appInputClassName, appSelectClassName } from '../ui/AppField';
import { ConfirmationDialog } from './ConfirmationDialog';
import { FieldError } from './FieldError';
import { ModalDialog } from './ModalDialog';

const columns: Array<{
  status: TaskStatus;
  title: string;
  panelClassName: string;
}> = [
  {
    status: 'todo',
    title: 'Todo',
    panelClassName: 'border-[rgba(83,110,104,0.16)] bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(247,241,231,0.96))]',
  },
  {
    status: 'in-progress',
    title: 'In Arbeit',
    panelClassName: 'border-[rgba(187,126,58,0.2)] bg-[linear-gradient(180deg,rgba(255,247,236,0.98),rgba(248,235,214,0.98))]',
  },
  {
    status: 'done',
    title: 'Erledigt',
    panelClassName: 'border-[rgba(25,98,77,0.18)] bg-[linear-gradient(180deg,rgba(242,249,245,0.98),rgba(229,242,236,0.98))]',
  },
];

type TaskDialogState = { mode: 'create' } | { mode: 'edit'; taskId: string };

type TaskDialogDraft = {
  title: string;
  owner: string;
  due: string;
  subtasks: PlannerState['tasks'][number]['subtasks'];
};

type PersistedTaskDialogDraft = {
  dialogState: TaskDialogState;
  draft: TaskDialogDraft;
};

const TASK_DIALOG_STORAGE_KEY = 'tasks-dialog';

function createTaskDialogDraft(ownerDefaultValue: string): TaskDialogDraft {
  return {
    title: '',
    owner: ownerDefaultValue.trim(),
    due: '',
    subtasks: [],
  };
}

function getDueBadgeClassName(due: string) {
  const state = getTaskDueState(due);

  if (state === 'overdue') {
    return 'border-[rgba(189,67,49,0.28)] bg-[rgba(233,108,85,0.16)] text-[#9f3222]';
  }

  if (state === 'soon') {
    return 'border-[rgba(205,126,43,0.24)] bg-[rgba(244,175,88,0.16)] text-[#9c5b0d]';
  }

  return 'border-[rgba(24,52,47,0.14)] bg-[rgba(255,255,255,0.72)] text-[rgba(24,52,47,0.78)]';
}

function getActiveColumnDropStyle(isActive: boolean) {
  if (!isActive) {
    return undefined;
  }

  return {
    borderColor: '#19624d',
    backgroundImage: 'linear-gradient(180deg, rgba(249,254,251,0.99), rgba(232,246,238,0.98))',
    boxShadow: '0 24px 44px rgba(25,98,77,0.12), 0 0 36px rgba(125,186,162,0.18), inset 0 0 0 2px #19624d',
  };
}

export function TasksModule({
  familyMemberOptions,
  ownerDefaultValue,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onSetTaskStatus,
  onToggleTaskSubtask,
}: {
  familyMemberOptions: string[];
  ownerDefaultValue: string;
  tasks: PlannerState['tasks'];
  onAddTask: (payload: Omit<TaskItem, 'id' | 'status'>) => Promise<boolean>;
  onUpdateTask: (id: string, payload: Partial<Omit<TaskItem, 'id'>>) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onSetTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  onToggleTaskSubtask: (taskId: string, subtaskId: string, done: boolean) => Promise<void>;
}) {
  const { activeTab } = useActiveTab();
  const [initialDialogDraft] = useState<PersistedTaskDialogDraft | null>(() =>
    loadUiDraft<PersistedTaskDialogDraft | null>(TASK_DIALOG_STORAGE_KEY, null),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDialogDraft>(() =>
    initialDialogDraft?.draft ?? createTaskDialogDraft(ownerDefaultValue),
  );
  const [taskDialogState, setTaskDialogState] = useState<TaskDialogState | null>(
    initialDialogDraft?.dialogState ?? null,
  );
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
  const [statusDialogTaskId, setStatusDialogTaskId] = useState<string | null>(null);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(null);
  const ownerOptions = Array.from(new Set([
    ownerDefaultValue.trim(),
    ...familyMemberOptions.map((member) => member.trim()),
  ].filter((value) => value.length > 0)));

  const editingTask = taskDialogState?.mode === 'edit'
    ? tasks.find((task) => task.id === taskDialogState.taskId) ?? null
    : null;

  const pendingDeleteTask = pendingDeleteTaskId
    ? tasks.find((task) => task.id === pendingDeleteTaskId) ?? null
    : null;

  const openMenuTask = menuTaskId
    ? tasks.find((task) => task.id === menuTaskId) ?? null
    : null;

  const buildTaskPayload = () => ({
    title: taskDraft.title.trim(),
    owner: taskDraft.owner.trim(),
    due: taskDraft.due.trim(),
    subtasks: taskDraft.subtasks
      .map((subtask) => ({ ...subtask, title: subtask.title.trim() }))
      .filter((subtask) => subtask.title.length > 0),
  });

  const persistTaskDialogDraft = (nextDialogState: TaskDialogState | null, nextDraft: TaskDialogDraft) => {
    if (!nextDialogState) {
      clearUiDraft(TASK_DIALOG_STORAGE_KEY);
      return;
    }

    saveUiDraft(TASK_DIALOG_STORAGE_KEY, {
      dialogState: nextDialogState,
      draft: nextDraft,
    });
  };

  const updateTaskDraft = (updater: (current: TaskDialogDraft) => TaskDialogDraft) => {
    setTaskDraft((current) => {
      const next = updater(current);
      persistTaskDialogDraft(taskDialogState, next);
      return next;
    });
  };

  useEffect(() => {
    if (taskDialogState?.mode === 'edit' && !editingTask) {
      setTaskDialogState(null);
      setTaskDraft(createTaskDialogDraft(ownerDefaultValue));
      clearUiDraft(TASK_DIALOG_STORAGE_KEY);
    }
  }, [editingTask, ownerDefaultValue, taskDialogState]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData();
    form.set('title', taskDraft.title);
    form.set('owner', taskDraft.owner);
    form.set('due', taskDraft.due);
    const next = validateRequiredFields(form, [
      { name: 'title', label: 'Aufgabe' },
      { name: 'owner', label: 'Verantwortlich' },
      { name: 'due', label: 'Fällig am' },
    ]);
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const payload = buildTaskPayload();

    setErrors({});
    const didSave = taskDialogState?.mode === 'edit' && editingTask
      ? await (async () => {
      const nextStatus = editingTask.status === 'done' && payload.subtasks.some((subtask) => !subtask.done)
        ? 'in-progress'
        : editingTask.status;

        return onUpdateTask(editingTask.id, {
        ...payload,
        status: nextStatus,
      });
      })()
      : await onAddTask(payload);

    if (!didSave) {
      return;
    }

    setTaskDraft(createTaskDialogDraft(ownerDefaultValue));
    setTaskDialogState(null);
    clearUiDraft(TASK_DIALOG_STORAGE_KEY);
  };

  const closeTaskDialog = () => {
    const nextDraft = createTaskDialogDraft(ownerDefaultValue);
    setTaskDialogState(null);
    setErrors({});
    setTaskDraft(nextDraft);
    persistTaskDialogDraft(null, nextDraft);
  };

  const openCreateDialog = () => {
    const nextDialogState: TaskDialogState = { mode: 'create' };
    const nextDraft = createTaskDialogDraft(ownerDefaultValue);
    setTaskDialogState(nextDialogState);
    setErrors({});
    setTaskDraft(nextDraft);
    setMenuTaskId(null);
    persistTaskDialogDraft(nextDialogState, nextDraft);
  };

  const openEditDialog = (task: PlannerState['tasks'][number]) => {
    const nextDialogState: TaskDialogState = { mode: 'edit', taskId: task.id };
    const nextDraft = {
      title: task.title,
      owner: task.owner,
      due: task.due,
      subtasks: task.subtasks.map((subtask) => ({ ...subtask })),
    };
    setTaskDialogState(nextDialogState);
    setErrors({});
    setTaskDraft(nextDraft);
    setMenuTaskId(null);
    persistTaskDialogDraft(nextDialogState, nextDraft);
  };

  const clearFieldError = (name: string) =>
    setErrors((current) => {
      if (!current[name]) return current;
      const { [name]: _removed, ...rest } = current;
      return rest;
    });

  const handleAddDraftSubtask = () => {
    updateTaskDraft((current) => ({
      ...current,
      subtasks: [...current.subtasks, { id: nextStringId(), title: '', done: false }],
    }));
  };

  const handleDraftSubtaskChange = (subtaskId: string, title: string) => {
    updateTaskDraft((current) => ({
      ...current,
      subtasks: current.subtasks.map((subtask) => (
        subtask.id === subtaskId ? { ...subtask, title } : subtask
      )),
    }));
  };

  const handleRemoveDraftSubtask = (subtaskId: string) => {
    updateTaskDraft((current) => ({
      ...current,
      subtasks: current.subtasks.filter((subtask) => subtask.id !== subtaskId),
    }));
  };

  const handleCardDragStart = (event: DragEvent<HTMLElement>, taskId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
    setDropTarget(null);
    setMenuTaskId(null);
  };

  const draggedTask = draggedTaskId ? tasks.find((entry) => entry.id === draggedTaskId) ?? null : null;

  const canDropIntoStatus = (status: TaskStatus) => {
    if (!draggedTask) {
      return false;
    }

    return draggedTask.status !== status;
  };

  const handleDragTarget = (status: TaskStatus) => {
    if (!canDropIntoStatus(status)) {
      setDropTarget(null);
      return;
    }

    setDropTarget((current) => (current === status ? current : status));
  };

  const handleTaskDrop = (event: DragEvent<HTMLElement>, status: TaskStatus) => {
    event.preventDefault();
    event.stopPropagation();
    const taskId = event.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    setDropTarget(null);

    if (!taskId) {
      return;
    }

    const task = tasks.find((entry) => entry.id === taskId);
    if (!task || task.status === status) {
      return;
    }

    void onSetTaskStatus(taskId, status);
  };

  const statusDialogTask = statusDialogTaskId
    ? tasks.find((task) => task.id === statusDialogTaskId) ?? null
    : null;

  const handleSelectStatusFromDialog = async (status: TaskStatus) => {
    if (!statusDialogTask) {
      return;
    }

    await onSetTaskStatus(statusDialogTask.id, status);
    setStatusDialogTaskId(null);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteTask) {
      return;
    }

    const didDelete = await onDeleteTask(pendingDeleteTask.id);
    if (!didDelete) {
      return;
    }

    setPendingDeleteTaskId(null);
  };

  return (
    <section className={activeTab === 'tasks' ? 'module is-visible' : 'module'}>
      <div className="grid content-start gap-4 max-mobile:gap-3">
        <div className="flex items-start">
          <AppButton
            type="button"
            variant="secondary"
            className="inline-flex items-center gap-2.5 border-[rgba(25,98,77,0.18)] bg-[rgba(255,250,244,0.96)] text-[#19624d] shadow-[0_16px_32px_rgba(24,52,47,0.08)] hover:bg-[rgba(243,249,246,0.98)]"
            onClick={openCreateDialog}
          >
            <Plus aria-hidden="true" size={18} strokeWidth={2.4} />
            <span>Todo hinzufügen</span>
          </AppButton>
        </div>
        <div className="grid gap-4 max-mobile:gap-3 xl:grid-cols-3 xl:items-stretch">
          {columns.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.status);
            const isColumnDropActive = dropTarget === column.status;

            return (
              <div key={column.status} className="grid min-w-0 xl:h-full">
                <AppCard
                  as="article"
                  data-drop-active={isColumnDropActive ? 'true' : undefined}
                  className={[
                    `relative min-w-0 transition-all duration-200 max-mobile:p-4 xl:flex xl:h-full xl:min-h-[26rem] xl:flex-col ${column.panelClassName}`,
                    openMenuTask?.status === column.status ? 'z-20' : 'z-0',
                    isColumnDropActive
                      ? '-translate-y-1 ring-2 ring-[rgba(25,98,77,0.2)]'
                      : '',
                  ].join(' ')}
                  style={getActiveColumnDropStyle(isColumnDropActive)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    handleDragTarget(column.status);
                  }}
                  onDrop={(event) => handleTaskDrop(event, column.status)}
                >
                  <div className="panel-heading items-center">
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <h4 className="text-[1.34rem] font-semibold leading-tight max-mobile:text-[1.12rem]">{column.title}</h4>
                      <span className="chip">{columnTasks.length}</span>
                    </div>
                  </div>

                  <div className="mt-3 max-mobile:mt-2 grid gap-3 max-mobile:gap-2">
                  {isColumnDropActive ? (
                    <div className="inline-flex w-fit items-center rounded-full border border-[rgba(25,98,77,0.24)] bg-[rgba(25,98,77,0.12)] px-3 py-1 text-[0.72rem] font-bold tracking-[0.04em] text-[#19624d] shadow-[0_10px_24px_rgba(25,98,77,0.12)] animate-pulse">
                      Loslassen zum Verschieben
                    </div>
                  ) : null}
                  {columnTasks.length > 0 ? columnTasks.map((task) => {
                    const progress = getTaskSubtaskProgress(task.subtasks);
                    const isDragging = draggedTaskId === task.id;

                    return (
                      <AppCard
                        as="article"
                        key={task.id}
                        draggable
                        onDragStart={(event) => handleCardDragStart(event, task.id)}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleDragTarget(column.status);
                        }}
                        onDrop={(event) => handleTaskDrop(event, column.status)}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDropTarget(null);
                        }}
                        className={[
                          'relative grid gap-3 border-[rgba(24,52,47,0.12)] bg-[rgba(255,255,255,0.98)] p-4 shadow-[0_18px_34px_rgba(35,27,17,0.06)] transition-all duration-150 max-mobile:gap-2 max-mobile:rounded-[20px] max-mobile:p-3',
                          isDragging ? 'scale-[0.985] opacity-70' : 'opacity-100',
                          menuTaskId === task.id ? 'z-30' : 'z-0',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="grid gap-[0.35rem] min-w-0">
                            <strong className="[overflow-wrap:anywhere]">{task.title}</strong>
                            <small className="text-[rgba(24,52,47,0.66)] max-mobile:text-[0.76rem]">{task.owner}</small>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className={`inline-flex items-center rounded-full border px-[0.65rem] py-[0.35rem] text-[0.76rem] font-bold max-mobile:px-[0.55rem] max-mobile:py-[0.28rem] max-mobile:text-[0.7rem] ${getDueBadgeClassName(task.due)}`}>
                              {formatTaskDueLabel(task.due)}
                            </span>
                            <div className="relative">
                              <AppButton
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="inline-flex size-9 items-center justify-center border-[rgba(24,52,47,0.12)] bg-[rgba(255,255,255,0.94)] text-[1.25rem] leading-none text-[#18342f]"
                                aria-label={`Aufgabe ${task.title} Aktionen`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setMenuTaskId((current) => (current === task.id ? null : task.id));
                                }}
                              >
                                ⋯
                              </AppButton>
                              {menuTaskId === task.id ? (
                                <div className="absolute right-0 top-11 z-40 grid min-w-[12rem] gap-1 rounded-[18px] border border-[rgba(24,52,47,0.12)] bg-[rgba(255,250,244,0.98)] p-2 shadow-[0_18px_36px_rgba(24,52,47,0.14)]">
                                  <AppButton
                                    type="button"
                                    variant="secondary"
                                    className="justify-start text-left"
                                    onClick={() => {
                                      setStatusDialogTaskId(task.id);
                                      setMenuTaskId(null);
                                    }}
                                  >
                                    Status ändern
                                  </AppButton>
                                  <AppButton
                                    type="button"
                                    variant="secondary"
                                    className="justify-start text-left"
                                    onClick={() => openEditDialog(task)}
                                  >
                                    Bearbeiten
                                  </AppButton>
                                  <AppButton
                                    type="button"
                                    variant="danger"
                                    className="justify-start text-left"
                                    onClick={() => {
                                      setPendingDeleteTaskId(task.id);
                                      setMenuTaskId(null);
                                    }}
                                  >
                                    Löschen
                                  </AppButton>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {task.subtasks.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2 text-[0.82rem] text-[rgba(24,52,47,0.74)] max-mobile:gap-[0.35rem] max-mobile:text-[0.74rem]">
                            <span className="inline-flex items-center rounded-full bg-[rgba(25,98,77,0.09)] px-[0.6rem] py-[0.28rem] font-semibold">
                              {progress.completed}/{progress.total} erledigt
                            </span>
                          </div>
                        ) : null}

                        {task.subtasks.length > 0 ? (
                          <div className="grid gap-2 rounded-[18px] bg-[rgba(247,243,235,0.74)] p-3 max-mobile:gap-[0.35rem] max-mobile:rounded-[16px] max-mobile:p-2.5">
                            {task.subtasks.map((subtask) => (
                              <label key={subtask.id} className="flex items-center gap-3 text-[0.92rem] text-[rgba(24,52,47,0.84)] max-mobile:gap-2 max-mobile:text-[0.84rem]">
                                <input
                                  type="checkbox"
                                  className={appCheckboxClassName()}
                                  checked={subtask.done}
                                  onChange={() => void onToggleTaskSubtask(task.id, subtask.id, !subtask.done)}
                                />
                                <span className={subtask.done ? 'line-through opacity-60' : ''}>{subtask.title}</span>
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </AppCard>
                    );
                  }) : (
                    <div className="grid gap-[0.25rem] rounded-[20px] border border-dashed border-[rgba(24,52,47,0.16)] bg-[rgba(255,255,255,0.5)] p-4 text-[rgba(24,52,47,0.62)]">
                      <strong className="text-[0.94rem]">Keine Karten in {column.title}</strong>
                      <small>Ziehe Aufgaben hierher oder lege oben eine neue an.</small>
                    </div>
                  )}
                  </div>
                </AppCard>
              </div>
            );
          })}
        </div>
      </div>

        {taskDialogState ? (
        <ModalDialog
          id="task-create-title"
            title={taskDialogState.mode === 'edit' ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
            eyebrow={taskDialogState.mode === 'edit' && editingTask ? editingTask.title : undefined}
          className="w-[min(640px,100%)]"
          actions={(
              <AppButton type="button" variant="secondary" onClick={closeTaskDialog}>
              Abbrechen
            </AppButton>
          )}
        >
          <form className="dialog-form form-panel grid gap-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
            <input
              className={appInputClassName()}
              name="title"
              placeholder="Aufgabe"
              value={taskDraft.title}
              aria-invalid={errors.title ? 'true' : undefined}
              aria-describedby={errors.title ? 'title-error' : undefined}
              onInput={(event) => {
                const nextTitle = event.currentTarget.value;
                updateTaskDraft((current) => ({ ...current, title: nextTitle }));
                clearFieldError('title');
              }}
            />
            <FieldError fieldName="title" message={errors.title} />
            <select
              className={appSelectClassName()}
              name="owner"
              aria-label="Verantwortlich"
              value={taskDraft.owner}
              aria-invalid={errors.owner ? 'true' : undefined}
              aria-describedby={errors.owner ? 'owner-error' : undefined}
              onInput={(event) => {
                const nextOwner = event.currentTarget.value;
                updateTaskDraft((current) => ({ ...current, owner: nextOwner }));
                clearFieldError('owner');
              }}
            >
              {ownerOptions.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
            <FieldError fieldName="owner" message={errors.owner} />
            <input
              className={appInputClassName()}
              name="due"
              type="date"
              aria-label="Fälligkeitsdatum"
              value={taskDraft.due}
              aria-invalid={errors.due ? 'true' : undefined}
              aria-describedby={errors.due ? 'due-error' : undefined}
              onInput={(event) => {
                const nextDue = event.currentTarget.value;
                updateTaskDraft((current) => ({ ...current, due: nextDue }));
                clearFieldError('due');
              }}
            />
            <FieldError fieldName="due" message={errors.due} />
            <div className="grid gap-3 rounded-[22px] border border-[rgba(24,52,47,0.1)] bg-[rgba(248,243,235,0.62)] p-4">
              <div className="flex items-center justify-between gap-3 max-compact:flex-col max-compact:items-start">
                <strong className="text-[0.96rem] text-[#18342f]">Subtasks</strong>
                <AppButton type="button" variant="secondary" onClick={handleAddDraftSubtask}>
                  Subtask hinzufügen
                </AppButton>
              </div>
              {taskDraft.subtasks.length > 0 ? (
                <div className="grid gap-2">
                  {taskDraft.subtasks.map((subtask, index) => (
                    <div key={subtask.id} className="flex items-center gap-2 max-compact:items-stretch">
                      <input
                        className={appInputClassName()}
                        value={subtask.title}
                        onChange={(event) => {
                          const nextTitle = event.currentTarget.value;
                          handleDraftSubtaskChange(subtask.id, nextTitle);
                        }}
                        placeholder={`Subtask ${index + 1}`}
                        aria-label={`Subtask ${index + 1}`}
                      />
                      <AppButton
                        type="button"
                        variant="ghost"
                        className="whitespace-nowrap"
                        onClick={() => handleRemoveDraftSubtask(subtask.id)}
                      >
                        Entfernen
                      </AppButton>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="m-0 text-[0.9rem] text-[rgba(24,52,47,0.62)]">Noch keine Subtasks ergänzt.</p>
              )}
            </div>
            <AppButton type="submit" variant="primary">{taskDialogState.mode === 'edit' ? 'Änderungen speichern' : 'Aufgabe speichern'}</AppButton>
          </form>
        </ModalDialog>
      ) : null}

      {pendingDeleteTask ? (
        <ConfirmationDialog
          id="task-delete-title"
          heading="Löschen?"
          actions={(
            <>
              <AppButton type="button" variant="secondary" onClick={() => setPendingDeleteTaskId(null)}>
                Abbrechen
              </AppButton>
              <AppButton type="button" variant="danger" onClick={() => void handleConfirmDelete()}>
                Löschen
              </AppButton>
            </>
          )}
        >
          <p className="m-0 text-[rgba(24,52,47,0.72)]">
            Aufgabe {pendingDeleteTask.title} löschen?
          </p>
        </ConfirmationDialog>
      ) : null}

      {statusDialogTask ? (
        <ModalDialog
          id="task-status-title"
          title="Status ändern"
          eyebrow={statusDialogTask.title}
          actions={(
            <AppButton type="button" variant="secondary" onClick={() => setStatusDialogTaskId(null)}>
              Abbrechen
            </AppButton>
          )}
        >
          <div className="grid gap-3">
            <p className="m-0 text-[rgba(24,52,47,0.72)]">
              Wähle den neuen Status für diese Aufgabe.
            </p>
            <div className="grid gap-2">
              {columns.map((target) => (
                <AppButton
                  key={target.status}
                  type="button"
                  variant="secondary"
                  className={[
                    'flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition',
                    target.status === statusDialogTask.status
                      ? 'border-[rgba(25,98,77,0.28)] bg-[rgba(25,98,77,0.1)] text-[#19624d]'
                      : 'border-[rgba(24,52,47,0.12)] bg-[rgba(255,255,255,0.92)] text-[#18342f]',
                  ].join(' ')}
                  onClick={() => void handleSelectStatusFromDialog(target.status)}
                >
                  <strong>{target.title}</strong>
                  <span className="chip alt">{getTaskStatusLabel(target.status)}</span>
                </AppButton>
              ))}
            </div>
          </div>
        </ModalDialog>
      ) : null}
    </section>
  );
}