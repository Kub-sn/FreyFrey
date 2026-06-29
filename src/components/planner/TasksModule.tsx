import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { PlannerState, TodoList, TodoListItem } from '../../lib/planner-data';
import { useActiveTab } from '../../context/ActiveTabContext';
import { cn } from '../../lib/classnames';
import { formatTodoListDate } from '../../lib/tasks';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { appCheckboxClassName, appInputClassName } from '../ui/AppField';
import { ConfirmationDialog } from './ConfirmationDialog';
import { ModalDialog } from './ModalDialog';

type TodoListDraft = {
  title: string;
  date: string;
};

function normalizeTodoText(text: string) {
  return text.trim().replace(/\s+/g, ' ');
}

function getNextTodoListTitle(lists: PlannerState['todoLists']) {
  let index = 1;

  while (lists.some((list) => list.title === `Todo Liste ${index}`)) {
    index += 1;
  }

  return `Todo Liste ${index}`;
}

export function TasksModule({
  lists,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onCreateItem,
  onToggleItem,
  onDeleteItem,
}: {
  lists: PlannerState['todoLists'];
  onCreateList: (payload: Omit<TodoList, 'id'>) => Promise<TodoList | null>;
  onUpdateList: (id: string, payload: Omit<TodoList, 'id'>) => Promise<boolean>;
  onDeleteList: (id: string) => Promise<boolean>;
  onCreateItem: (listId: string, title: string) => Promise<TodoListItem | null>;
  onToggleItem: (listId: string, itemId: string, checked: boolean) => Promise<void>;
  onDeleteItem: (listId: string, itemId: string) => Promise<void>;
}) {
  const { activeTab } = useActiveTab();
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [menuListId, setMenuListId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [pendingDeleteListId, setPendingDeleteListId] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [listDraft, setListDraft] = useState<TodoListDraft>({ title: '', date: '' });
  const [quickAddText, setQuickAddText] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const quickAddInputRef = useRef<HTMLInputElement | null>(null);

  const openList = useMemo(
    () => lists.find((list) => list.id === openListId) ?? null,
    [lists, openListId],
  );

  const pendingDeleteList = useMemo(
    () => lists.find((list) => list.id === pendingDeleteListId) ?? null,
    [lists, pendingDeleteListId],
  );

  const editingList = useMemo(
    () => lists.find((list) => list.id === editingListId) ?? null,
    [lists, editingListId],
  );

  const focusQuickAddInput = () => {
    requestAnimationFrame(() => {
      quickAddInputRef.current?.focus();
    });
  };

  const openListDialog = (listId: string) => {
    setMenuListId(null);
    setOpenListId(listId);
    setQuickAddText('');
    focusQuickAddInput();
  };

  const handleCreateList = async () => {
    const title = listDraft.title.trim() || getNextTodoListTitle(lists);
    const createdList = await onCreateList({
      title,
      ...(listDraft.date.trim() ? { date: listDraft.date.trim() } : {}),
      items: [],
    });

    if (!createdList) {
      return;
    }

    setMenuListId(null);
    setIsCreateDialogOpen(false);
    setListDraft({ title: '', date: '' });
    setOpenListId(createdList.id);
    setQuickAddText('');
    setValidationMessage(null);
    focusQuickAddInput();
  };

  const openEditDialog = (list: TodoList) => {
    setEditingListId(list.id);
    setListDraft({
      title: list.title,
      date: list.date ?? '',
    });
    setValidationMessage(null);
    setMenuListId(null);
  };

  const openCreateDialog = () => {
    setListDraft({ title: '', date: '' });
    setValidationMessage(null);
    setMenuListId(null);
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setListDraft({ title: '', date: '' });
    setValidationMessage(null);
  };

  const closeEditDialog = () => {
    setEditingListId(null);
    setListDraft({ title: '', date: '' });
    setValidationMessage(null);
  };

  const handleSaveList = async () => {
    if (!editingList) {
      return;
    }

    const title = listDraft.title.trim();

    if (!title) {
      setValidationMessage('Bitte gib einen Namen für die Todo-Liste ein.');
      return;
    }

    const didSave = await onUpdateList(editingList.id, {
      title,
      ...(listDraft.date.trim() ? { date: listDraft.date.trim() } : {}),
      items: editingList.items,
    });

    if (!didSave) {
      return;
    }

    closeEditDialog();
  };

  const handleQuickAddItem = async () => {
    if (!openList) {
      return;
    }

    const title = normalizeTodoText(quickAddText);

    if (!title) {
      return;
    }

    const createdItem = await onCreateItem(openList.id, title);

    if (!createdItem) {
      return;
    }

    setQuickAddText('');
    focusQuickAddInput();
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteList) {
      return;
    }

    const didDelete = await onDeleteList(pendingDeleteList.id);

    if (!didDelete) {
      return;
    }

    if (openListId === pendingDeleteList.id) {
      setOpenListId(null);
    }

    if (editingListId === pendingDeleteList.id) {
      closeEditDialog();
    }

    setPendingDeleteListId(null);
    setMenuListId(null);
  };

  return (
    <section className={activeTab === 'tasks' ? 'module is-visible' : 'module'}>
      <div className="grid content-start gap-4 max-mobile:gap-3">
        <div className="flex items-start max-mobile:w-full">
          <AppButton
            type="button"
            variant="secondary"
            className="inline-flex items-center gap-2.5 border-[rgba(25,98,77,0.18)] bg-[rgba(255,250,244,0.96)] text-[#19624d] shadow-[0_16px_32px_rgba(24,52,47,0.08)] hover:bg-[rgba(243,249,246,0.98)] max-mobile:w-full max-mobile:justify-center"
            onClick={openCreateDialog}
          >
            <Plus aria-hidden="true" size={18} strokeWidth={2.4} />
            <span>Liste erstellen</span>
          </AppButton>
        </div>

        <div className="grid gap-4 max-mobile:gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lists.map((list) => {
            const openItems = list.items.filter((item) => !item.checked).length;

            return (
              <AppCard
                key={list.id}
                className={cn(
                  'panel relative flex min-h-[11rem] flex-col gap-3 border border-[rgba(24,52,47,0.1)] bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(247,241,231,0.96))] p-4 max-mobile:gap-2.5 max-mobile:p-3.5',
                  menuListId === list.id ? 'z-30' : 'z-0',
                )}
              >
                <button
                  type="button"
                  className="absolute inset-0 rounded-[24px] focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(25,98,77,0.12)]"
                  aria-label={`Todo-Liste ${list.title} öffnen`}
                  data-testid={`todo-list-open-surface-${list.id}`}
                  onClick={() => openListDialog(list.id)}
                />

                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="pointer-events-none grid min-w-0 flex-1 gap-3 rounded-[20px]">
                    <div className="grid gap-2">
                      {list.date ? (
                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(25,98,77,0.14)] bg-[rgba(255,255,255,0.66)] px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.66)]">
                          <CalendarDays aria-hidden="true" size={14} />
                          <span>{formatTodoListDate(list.date)}</span>
                        </div>
                      ) : null}
                      <h4 className="m-0 text-[1.08rem] font-semibold leading-tight text-[#18342f] max-mobile:text-[1rem]">{list.title}</h4>
                      <span className="text-[0.86rem] text-[rgba(24,52,47,0.62)]">
                        {openItems} offen · {list.items.length} gesamt
                      </span>
                    </div>
                  </div>

                  <div className="relative z-20 shrink-0">
                    <AppButton
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="inline-flex size-9 items-center justify-center border-[rgba(24,52,47,0.12)] bg-[rgba(255,255,255,0.94)] text-[1.25rem] leading-none text-[#18342f]"
                      aria-label={`Todo-Liste ${list.title} Aktionen`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuListId((current) => (current === list.id ? null : list.id));
                      }}
                    >
                      ⋯
                    </AppButton>

                    {menuListId === list.id ? (
                      <div
                        className="absolute right-0 top-11 z-40 grid min-w-[12rem] gap-1 rounded-[18px] border border-[rgba(24,52,47,0.12)] bg-[rgba(255,250,244,0.98)] p-2 shadow-[0_18px_36px_rgba(24,52,47,0.14)]"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <AppButton
                          type="button"
                          variant="secondary"
                          className="justify-start gap-2 text-left"
                          onClick={() => openEditDialog(list)}
                        >
                          <Pencil aria-hidden="true" size={16} />
                          Bearbeiten
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="danger"
                          className="justify-start gap-2 text-left"
                          onClick={() => {
                            setPendingDeleteListId(list.id);
                            setMenuListId(null);
                          }}
                        >
                          <Trash2 aria-hidden="true" size={18} />
                          Löschen
                        </AppButton>
                      </div>
                    ) : null}
                  </div>
                </div>
              </AppCard>
            );
          })}

          {lists.length === 0 ? (
            <AppCard className="flex min-h-[11rem] flex-col items-center justify-center gap-3 border-dashed border-[rgba(24,52,47,0.18)] bg-[rgba(255,250,244,0.78)] p-4 text-center text-[rgba(24,52,47,0.6)]">
              <Plus aria-hidden="true" size={28} />
              <div className="grid gap-1">
                <strong className="text-[#18342f]">Noch keine Todo-Liste</strong>
                <span>Erstelle eine Liste und erfasse To-dos direkt per Enter.</span>
              </div>
            </AppCard>
          ) : null}
        </div>
      </div>

      {isCreateDialogOpen ? (
        <ModalDialog
          id="todo-list-create-title"
          title="Neue Todo-Liste"
          className="w-[min(560px,100%)]"
          actions={(
            <>
              <AppButton type="button" variant="secondary" onClick={closeCreateDialog}>
                Abbrechen
              </AppButton>
              <AppButton type="button" variant="primary" onClick={() => void handleCreateList()}>
                Liste erstellen
              </AppButton>
            </>
          )}
        >
          <div className="grid gap-4 max-mobile:gap-3">
            <label className="grid gap-2">
              <span className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.62)]">Listenname</span>
              <input
                className={appInputClassName()}
                value={listDraft.title}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  setListDraft((current) => ({ ...current, title: value }));
                }}
                placeholder={getNextTodoListTitle(lists)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.62)]">Fristdatum (optional)</span>
              <input
                className={appInputClassName()}
                type="date"
                value={listDraft.date}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  setListDraft((current) => ({ ...current, date: value }));
                }}
              />
            </label>
          </div>
        </ModalDialog>
      ) : null}

      {openList ? (
        <ModalDialog
          id="todo-list-open-title"
          title={openList.title}
          eyebrow={openList.date ? formatTodoListDate(openList.date) : undefined}
          className="w-[min(640px,100%)]"
          actions={(
            <AppButton type="button" variant="secondary" onClick={() => setOpenListId(null)}>
              Schließen
            </AppButton>
          )}
        >
          <div className="grid gap-4 max-mobile:gap-3">
            <div>
              <input
                ref={quickAddInputRef}
                className={appInputClassName()}
                value={quickAddText}
                aria-label="Todo hinzufügen"
                onChange={(event) => setQuickAddText(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') {
                    return;
                  }

                  event.preventDefault();
                  void handleQuickAddItem();
                }}
                placeholder="z. B. Kinderzimmer aufräumen"
              />
            </div>

            {openList.items.length > 0 ? (
              <ul className="check-list max-h-[min(54vh,26rem)] overflow-y-auto pr-5">
                {openList.items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      '!flex-row !items-center !gap-2 !py-2 text-[0.9rem]',
                      item.checked && '[&_.todo-item-copy]:opacity-60 [&_.todo-item-copy]:line-through',
                    )}
                  >
                    <label className="min-w-0 flex-1 text-[0.9rem]">
                      <input
                        type="checkbox"
                        className={appCheckboxClassName()}
                        checked={item.checked}
                        onChange={() => void onToggleItem(openList.id, item.id, !item.checked)}
                      />
                      <span className="todo-item-copy">{item.title}</span>
                    </label>

                    <AppButton
                      type="button"
                      variant="danger"
                      size="icon"
                      className="ml-1 size-8 min-w-8 shrink-0 self-center [&_svg]:size-4"
                      onClick={() => void onDeleteItem(openList.id, item.id)}
                      aria-label={`Todo ${item.title} löschen`}
                    >
                      <Trash2 aria-hidden="true" strokeWidth={2.2} />
                    </AppButton>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </ModalDialog>
      ) : null}

      {editingList ? (
        <ModalDialog
          id="todo-list-editor-title"
          title="Todo-Liste bearbeiten"
          className="w-[min(560px,100%)]"
          actions={(
            <>
              <AppButton type="button" variant="secondary" onClick={closeEditDialog}>
                Abbrechen
              </AppButton>
              <AppButton type="button" variant="primary" onClick={() => void handleSaveList()}>
                Liste speichern
              </AppButton>
            </>
          )}
        >
          <div className="grid gap-4 max-mobile:gap-3">
            <label className="grid gap-2">
              <span className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.62)]">Listenname</span>
              <input
                className={appInputClassName()}
                value={listDraft.title}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  setListDraft((current) => ({ ...current, title: value }));
                }}
                placeholder="z. B. Wochenende"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.62)]">Fristdatum (optional)</span>
              <input
                className={appInputClassName()}
                type="date"
                value={listDraft.date}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  setListDraft((current) => ({ ...current, date: value }));
                }}
              />
            </label>

            {validationMessage ? (
              <p className="m-0 rounded-[18px] bg-[rgba(165,71,34,0.12)] px-4 py-3 text-[#8f3415]">{validationMessage}</p>
            ) : null}
          </div>
        </ModalDialog>
      ) : null}

      {pendingDeleteList ? (
        <ConfirmationDialog
          heading="Todo-Liste löschen?"
          hideHeading
          id="delete-todo-list-title"
          actions={(
            <>
              <AppButton type="button" variant="secondary" onClick={() => setPendingDeleteListId(null)}>
                Abbrechen
              </AppButton>
              <AppButton type="button" variant="danger" onClick={() => void handleConfirmDelete()}>
                Löschen
              </AppButton>
            </>
          )}
        >
          <p className="m-0 inline-flex max-w-full flex-nowrap items-baseline gap-1 overflow-x-auto whitespace-nowrap">
            <span>Liste</span>
            <strong className="font-bold">{pendingDeleteList.title}</strong>
            <span>löschen?</span>
          </p>
        </ConfirmationDialog>
      ) : null}
    </section>
  );
}