import { CalendarDays, Pencil, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PlannerState, ShoppingList, ShoppingListItem } from '../../lib/planner-data';
import { useActiveTab } from '../../context/ActiveTabContext';
import { cn } from '../../lib/classnames';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { appCheckboxClassName, appInputClassName } from '../ui/AppField';
import { ConfirmationDialog } from './ConfirmationDialog';
import { ModalDialog } from './ModalDialog';
import { useQuickAddInput } from './useQuickAddInput';

type ShoppingListDraft = {
  title: string;
  date: string;
};

function normalizeItemText(text: string) {
  return text.trim().replace(/\s+/g, ' ');
}

function parseShoppingItemText(text: string): Pick<ShoppingListItem, 'name' | 'quantity'> {
  const normalizedText = normalizeItemText(text);

  if (!normalizedText) {
    return {
      name: '',
      quantity: undefined,
    };
  }

  const tokens = normalizedText.split(' ');
  const firstToken = tokens[0] ?? '';

  if (!/\d/.test(firstToken)) {
    return {
      name: normalizedText,
      quantity: undefined,
    };
  }

  const quantityTokens = [firstToken];
  let nameStartIndex = 1;

  while (nameStartIndex < tokens.length - 1) {
    const token = tokens[nameStartIndex] ?? '';

    if (!/^[\p{L}%./-]+$/u.test(token)) {
      break;
    }

    quantityTokens.push(token);
    nameStartIndex += 1;
  }

  return {
    name: tokens.slice(nameStartIndex).join(' ').trim(),
    quantity: quantityTokens.join(' ').trim() || undefined,
  };
}

function getTodayDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
}

function createEmptyDraft(): ShoppingListDraft {
  return {
    title: '',
    date: getTodayDate(),
  };
}

function formatListDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsedDate);
}

function getNextShoppingListTitle(lists: PlannerState['shoppingLists']) {
  let index = 1;

  while (lists.some((list) => list.title === `Einkaufsliste ${index}`)) {
    index += 1;
  }

  return `Einkaufsliste ${index}`;
}

const fieldLabelClassName = 'text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.62)]';

function ShoppingListFields({
  draft,
  onChange,
  titlePlaceholder,
  validationMessage,
}: {
  draft: ShoppingListDraft;
  onChange: (field: keyof ShoppingListDraft, value: string) => void;
  titlePlaceholder: string;
  validationMessage: string | null;
}) {
  return (
    <div className="grid gap-4 max-mobile:gap-3">
      <label className="grid gap-2">
        <span className={fieldLabelClassName}>Listenname</span>
        <input
          className={appInputClassName()}
          value={draft.title}
          onChange={(event) => onChange('title', event.currentTarget.value)}
          placeholder={titlePlaceholder}
        />
      </label>

      <label className="grid gap-2">
        <span className={fieldLabelClassName}>Datum</span>
        <input
          className={appInputClassName()}
          type="date"
          value={draft.date}
          onChange={(event) => onChange('date', event.currentTarget.value)}
        />
      </label>

      {validationMessage ? (
        <p className="m-0 rounded-[18px] bg-[rgba(165,71,34,0.12)] px-4 py-3 text-[#8f3415]">{validationMessage}</p>
      ) : null}
    </div>
  );
}

export function ShoppingModule({
  lists,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onCreateItem,
  onToggleItem,
  onDeleteItem,
}: {
  lists: PlannerState['shoppingLists'];
  onCreateList: (payload: Omit<ShoppingList, 'id'>) => Promise<ShoppingList | null>;
  onUpdateList: (id: string, payload: Omit<ShoppingList, 'id' | 'items'>) => Promise<boolean>;
  onDeleteList: (id: string) => Promise<boolean>;
  onCreateItem: (listId: string, payload: Pick<ShoppingListItem, 'name' | 'quantity'>) => Promise<ShoppingListItem | null>;
  onToggleItem: (listId: string, itemId: string, checked: boolean) => Promise<void>;
  onDeleteItem: (listId: string, itemId: string) => Promise<void>;
}) {
  const { activeTab } = useActiveTab();
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [menuListId, setMenuListId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [pendingDeleteListId, setPendingDeleteListId] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [listDraft, setListDraft] = useState<ShoppingListDraft>(createEmptyDraft);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

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

  const quickAdd = useQuickAddInput(async (text) => {
    if (!openList) {
      return false;
    }

    const parsedItem = parseShoppingItemText(text);

    if (!parsedItem.name) {
      return false;
    }

    return Boolean(await onCreateItem(openList.id, parsedItem));
  });

  const updateDraftField = (field: keyof ShoppingListDraft, value: string) => {
    setListDraft((current) => ({ ...current, [field]: value }));
  };

  const openListDialog = (listId: string) => {
    setMenuListId(null);
    setOpenListId(listId);
    quickAdd.reset();
  };

  const openCreateDialog = () => {
    setListDraft(createEmptyDraft());
    setValidationMessage(null);
    setMenuListId(null);
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setListDraft(createEmptyDraft());
    setValidationMessage(null);
  };

  const openEditDialog = (list: ShoppingList) => {
    setEditingListId(list.id);
    setListDraft({
      title: list.title,
      date: list.date,
    });
    setValidationMessage(null);
    setMenuListId(null);
  };

  const closeEditDialog = () => {
    setEditingListId(null);
    setListDraft(createEmptyDraft());
    setValidationMessage(null);
  };

  const handleCreateList = async () => {
    const date = listDraft.date.trim();

    if (!date) {
      setValidationMessage('Bitte wähle ein Datum für die Einkaufsliste.');
      return;
    }

    const createdList = await onCreateList({
      title: listDraft.title.trim() || getNextShoppingListTitle(lists),
      date,
      items: [],
    });

    if (!createdList) {
      return;
    }

    closeCreateDialog();
    setOpenListId(createdList.id);
    quickAdd.reset();
    quickAdd.focus();
  };

  const handleSaveList = async () => {
    if (!editingList) {
      return;
    }

    const title = listDraft.title.trim();
    const date = listDraft.date.trim();

    if (!title) {
      setValidationMessage('Bitte gib einen Namen für die Einkaufsliste ein.');
      return;
    }

    if (!date) {
      setValidationMessage('Bitte wähle ein Datum für die Einkaufsliste.');
      return;
    }

    const didSave = await onUpdateList(editingList.id, { title, date });

    if (!didSave) {
      return;
    }

    closeEditDialog();
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
    <section className={activeTab === 'shopping' ? 'module is-visible' : 'module'}>
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
          {lists.map((list) => (
            <AppCard
              key={list.id}
              className={cn(
                'panel relative flex min-h-0 flex-col gap-3 border border-[rgba(24,52,47,0.1)] bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(247,241,231,0.96))] p-4 max-mobile:gap-2.5 max-mobile:p-3.5',
                menuListId === list.id ? 'z-30' : 'z-0',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="grid min-w-0 flex-1 gap-3 rounded-[20px] text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(25,98,77,0.12)]"
                  onClick={() => openListDialog(list.id)}
                >
                  <div className="grid gap-2">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(25,98,77,0.14)] bg-[rgba(255,255,255,0.66)] px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.66)]">
                      <CalendarDays aria-hidden="true" size={14} />
                      <span>{formatListDate(list.date)}</span>
                    </div>
                    <h4 className="m-0 text-[1.08rem] font-semibold leading-tight text-[#18342f] max-mobile:text-[1rem]">{list.title}</h4>
                  </div>
                </button>

                <div className="relative shrink-0">
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="inline-flex size-9 items-center justify-center border-[rgba(24,52,47,0.12)] bg-[rgba(255,255,255,0.94)] text-[1.25rem] leading-none text-[#18342f]"
                    aria-label={`Einkaufsliste ${list.title} Aktionen`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuListId((current) => (current === list.id ? null : list.id));
                    }}
                  >
                    ⋯
                  </AppButton>

                  {menuListId === list.id ? (
                    <div className="absolute right-0 top-11 z-40 grid min-w-[12rem] gap-1 rounded-[18px] border border-[rgba(24,52,47,0.12)] bg-[rgba(255,250,244,0.98)] p-2 shadow-[0_18px_36px_rgba(24,52,47,0.14)]">
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
          ))}

          {lists.length === 0 ? (
            <AppCard className="flex min-h-[11rem] flex-col items-center justify-center gap-3 border-dashed border-[rgba(24,52,47,0.18)] bg-[rgba(255,250,244,0.78)] p-4 text-center text-[rgba(24,52,47,0.6)]">
              <ShoppingCart aria-hidden="true" size={28} />
              <div className="grid gap-1">
                <strong className="text-[#18342f]">Noch keine Einkaufsliste</strong>
                <span>Erstelle eine Liste und füge Artikel direkt per Enter hinzu.</span>
              </div>
            </AppCard>
          ) : null}
        </div>
      </div>

      {isCreateDialogOpen ? (
        <ModalDialog
          id="shopping-list-create-title"
          title="Neue Einkaufsliste"
          className="w-[min(560px,100%)]"
          onClose={closeCreateDialog}
          actions={(
            <>
              <AppButton type="button" variant="secondary" className="max-mobile:hidden" onClick={closeCreateDialog}>
                Abbrechen
              </AppButton>
              <AppButton type="button" variant="primary" onClick={() => void handleCreateList()}>
                Liste erstellen
              </AppButton>
            </>
          )}
        >
          <ShoppingListFields
            draft={listDraft}
            onChange={updateDraftField}
            titlePlaceholder={getNextShoppingListTitle(lists)}
            validationMessage={validationMessage}
          />
        </ModalDialog>
      ) : null}

      {openList ? (
        <ModalDialog
          id="shopping-list-open-title"
          title={openList.title}
          eyebrow={formatListDate(openList.date)}
          className="w-[min(640px,100%)]"
          onClose={() => setOpenListId(null)}
          actions={(
            <AppButton type="button" variant="secondary" className="max-mobile:hidden" onClick={() => setOpenListId(null)}>
              Schließen
            </AppButton>
          )}
        >
          <div className="grid gap-4 max-mobile:gap-3 max-mobile:h-full max-mobile:min-h-0 max-mobile:grid-rows-[auto_minmax(0,1fr)]">
            <div>
              <input
                {...quickAdd.inputProps}
                className={appInputClassName()}
                aria-label="Artikel hinzufügen"
                placeholder="z. B. 2 Brot"
              />
            </div>

            {openList.items.length > 0 ? (
              <ul className="check-list content-start max-h-[min(54vh,26rem)] max-mobile:max-h-none max-mobile:min-h-0 overflow-y-auto pr-5">
                {openList.items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      '!flex-row !items-center !gap-2 !py-2 text-[0.9rem]',
                      item.checked && '[&_.shopping-item-copy]:opacity-60 [&_.shopping-item-copy]:line-through',
                    )}
                  >
                    <label className="min-w-0 flex-1 text-[0.9rem]">
                      <input
                        type="checkbox"
                        className={appCheckboxClassName()}
                        checked={item.checked}
                        onChange={() => void onToggleItem(openList.id, item.id, !item.checked)}
                      />
                      <span className="shopping-item-copy inline-flex items-center gap-2">
                        {item.quantity ? <span>{item.quantity}</span> : null}
                        <span>{item.name}</span>
                      </span>
                    </label>

                    <AppButton
                      type="button"
                      variant="danger"
                      size="icon"
                      className="ml-1 size-8 min-w-8 shrink-0 self-center [&_svg]:size-4"
                      onClick={() => void onDeleteItem(openList.id, item.id)}
                      aria-label={`Artikel ${item.name} löschen`}
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
          id="shopping-list-editor-title"
          title="Einkaufsliste bearbeiten"
          className="w-[min(560px,100%)]"
          onClose={closeEditDialog}
          actions={(
            <>
              <AppButton type="button" variant="secondary" className="max-mobile:hidden" onClick={closeEditDialog}>
                Abbrechen
              </AppButton>
              <AppButton type="button" variant="primary" onClick={() => void handleSaveList()}>
                Liste speichern
              </AppButton>
            </>
          )}
        >
          <ShoppingListFields
            draft={listDraft}
            onChange={updateDraftField}
            titlePlaceholder="z. B. Wocheneinkauf"
            validationMessage={validationMessage}
          />
        </ModalDialog>
      ) : null}

      {pendingDeleteList ? (
        <ConfirmationDialog
          heading="Einkaufsliste löschen?"
          id="delete-shopping-list-title"
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
          <p className="m-0 py-[0.9rem] px-4 rounded-[18px] bg-[rgba(165,71,34,0.12)] text-[#8f3415] leading-relaxed">
            Die Einkaufsliste {pendingDeleteList.title} wird mit allen Artikeln gelöscht.
          </p>
        </ConfirmationDialog>
      ) : null}
    </section>
  );
}
