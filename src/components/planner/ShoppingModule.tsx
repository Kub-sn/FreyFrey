import { CalendarDays, Pencil, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { PlannerState, ShoppingList, ShoppingListItem } from '../../lib/planner-data';
import { useActiveTab } from '../../context/ActiveTabContext';
import { nextStringId } from '../../lib/id';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { appCheckboxClassName, appInputClassName } from '../ui/AppField';
import { ConfirmationDialog } from './ConfirmationDialog';
import { ModalDialog } from './ModalDialog';

type ShoppingListDraftItem = {
  id: string;
  text: string;
  checked: boolean;
};

type ShoppingListDraft = {
  title: string;
  date: string;
  items: ShoppingListDraftItem[];
};

function normalizeDraftItemText(text: string) {
  return text.trim().replace(/\s+/g, ' ');
}

function formatDraftItemText(item: Pick<ShoppingListItem, 'name' | 'quantity'>) {
  return [item.quantity, item.name].filter(Boolean).join(' ');
}

function parseDraftItemText(text: string) {
  const normalizedText = normalizeDraftItemText(text);

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

function createDraftList(): ShoppingListDraft {
  return {
    title: '',
    date: new Date().toISOString().slice(0, 10),
    items: [],
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

function getOpenItemCount(list: ShoppingList) {
  return list.items.filter((item) => !item.checked).length;
}

export function ShoppingModule({
  lists,
  onCreateList,
  onDeleteList,
  onToggleItem,
  onUpdateList,
}: {
  lists: PlannerState['shoppingLists'];
  onCreateList: (payload: Omit<ShoppingList, 'id'>) => Promise<boolean>;
  onDeleteList: (id: string) => Promise<boolean>;
  onToggleItem: (listId: string, itemId: string, checked: boolean) => Promise<void>;
  onUpdateList: (id: string, payload: Omit<ShoppingList, 'id'>) => Promise<boolean>;
}) {
  const { activeTab } = useActiveTab();
  const [editorState, setEditorState] = useState<{ mode: 'create' } | { mode: 'edit'; listId: string } | null>(null);
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [pendingDeleteListId, setPendingDeleteListId] = useState<string | null>(null);
  const [draftList, setDraftList] = useState<ShoppingListDraft>(createDraftList);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [quickAddItemText, setQuickAddItemText] = useState('');
  const quickAddInputRef = useRef<HTMLInputElement | null>(null);

  const openList = useMemo(
    () => lists.find((list) => list.id === openListId) ?? null,
    [lists, openListId],
  );

  const pendingDeleteList = useMemo(
    () => lists.find((list) => list.id === pendingDeleteListId) ?? null,
    [lists, pendingDeleteListId],
  );

  const resetEditor = () => {
    setDraftList(createDraftList());
    setQuickAddItemText('');
    setValidationMessage(null);
    setEditorState(null);
  };

  const openCreateDialog = () => {
    setDraftList(createDraftList());
    setQuickAddItemText('');
    setValidationMessage(null);
    setEditorState({ mode: 'create' });
  };

  const openEditDialog = (list: ShoppingList) => {
    setDraftList({
      title: list.title,
      date: list.date,
      items: list.items.map((item) => ({
        id: item.id,
        text: formatDraftItemText(item),
        checked: item.checked,
      })),
    });
    setQuickAddItemText('');
    setValidationMessage(null);
    setEditorState({ mode: 'edit', listId: list.id });
  };

  const updateDraftField = (field: keyof Omit<ShoppingListDraft, 'items'>, value: string) => {
    setDraftList((current) => ({ ...current, [field]: value }));
  };

  const updateDraftItemText = (itemId: string, value: string) => {
    setDraftList((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, text: value } : item,
      ),
    }));
  };

  const focusQuickAddInput = () => {
    requestAnimationFrame(() => {
      quickAddInputRef.current?.focus();
    });
  };

  const addDraftItem = (text: string) => {
    const normalizedText = normalizeDraftItemText(text);

    if (!normalizedText) {
      return false;
    }

    setDraftList((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: nextStringId(),
          text: normalizedText,
          checked: false,
        },
      ],
    }));
    setQuickAddItemText('');
    setValidationMessage(null);
    focusQuickAddInput();

    return true;
  };

  const removeDraftItem = (itemId: string) => {
    setDraftList((current) => {
      return {
        ...current,
        items: current.items.filter((item) => item.id !== itemId),
      };
    });
  };

  const handleQuickAddItem = () => {
    addDraftItem(quickAddItemText);
  };

  const handleSaveList = async () => {
    const normalizedItems = draftList.items
      .map((item) => ({
        id: item.id,
        checked: item.checked,
        text: normalizeDraftItemText(item.text),
      }))
      .filter((item) => item.text)
      .map((item) => {
        const parsedItem = parseDraftItemText(item.text);

        return {
          id: item.id,
          checked: item.checked,
          name: parsedItem.name,
          quantity: parsedItem.quantity,
        };
      });

    if (!draftList.title.trim()) {
      setValidationMessage('Bitte gib der Einkaufsliste einen Namen.');
      return;
    }

    if (!draftList.date) {
      setValidationMessage('Bitte wähle ein Datum für die Einkaufsliste.');
      return;
    }

    if (normalizedItems.length === 0) {
      setValidationMessage('Bitte füge mindestens einen Artikel hinzu.');
      return;
    }

    if (normalizedItems.some((item) => !item.name)) {
      setValidationMessage('Jeder Artikel braucht einen Namen.');
      return;
    }

    const payload = {
      title: draftList.title.trim(),
      date: draftList.date,
      items: normalizedItems,
    };

    const didSave = editorState?.mode === 'edit'
      ? await onUpdateList(editorState.listId, payload)
      : await onCreateList(payload);

    if (!didSave) {
      return;
    }

    resetEditor();
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

    setPendingDeleteListId(null);
  };

  return (
    <section className={activeTab === 'shopping' ? 'module is-visible' : 'module'}>
      <div className="grid content-start gap-4 max-[720px]:gap-3">
        <div className="flex items-start max-[720px]:w-full">
          <AppButton
            type="button"
            variant="secondary"
            className="inline-flex items-center gap-2.5 border-[rgba(25,98,77,0.18)] bg-[rgba(255,250,244,0.96)] text-[#19624d] shadow-[0_16px_32px_rgba(24,52,47,0.08)] hover:bg-[rgba(243,249,246,0.98)] max-[720px]:w-full max-[720px]:justify-center"
            onClick={openCreateDialog}
          >
            <Plus aria-hidden="true" size={18} strokeWidth={2.4} />
            <span>Liste erstellen</span>
          </AppButton>
        </div>

        <div className="grid gap-4 max-[720px]:gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lists.map((list) => (
            <AppCard
              key={list.id}
              className="panel flex min-h-0 flex-col gap-3 border border-[rgba(24,52,47,0.1)] bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(247,241,231,0.96))] p-4 max-[720px]:gap-2.5 max-[720px]:p-3.5"
            >
              <button
                type="button"
                className="grid gap-3 rounded-[20px] text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(25,98,77,0.12)]"
                onClick={() => setOpenListId(list.id)}
              >
                <div className="grid gap-2">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(25,98,77,0.14)] bg-[rgba(255,255,255,0.66)] px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.66)]">
                      <CalendarDays aria-hidden="true" size={14} />
                      <span>{formatListDate(list.date)}</span>
                  </div>
                  <h4 className="m-0 text-[1.08rem] font-semibold leading-tight text-[#18342f] max-[720px]:text-[1rem]">{list.title}</h4>
                  <p className="m-0 text-[0.88rem] text-[rgba(24,52,47,0.6)]">
                    Tippen zum Oeffnen. {getOpenItemCount(list)} von {list.items.length} Artikeln sind offen.
                  </p>
                </div>
              </button>

              <div className="mt-auto flex flex-wrap justify-end gap-2 max-[720px]:justify-stretch">
                <AppButton
                  type="button"
                  variant="secondary"
                  className="inline-flex items-center gap-2 max-[720px]:flex-1 max-[720px]:justify-center max-[720px]:px-3 max-[720px]:py-2.5"
                  onClick={() => openEditDialog(list)}
                >
                  <Pencil aria-hidden="true" size={16} />
                  Bearbeiten
                </AppButton>
                <AppButton
                  type="button"
                  variant="danger"
                  className="inline-flex items-center gap-2 max-[720px]:flex-1 max-[720px]:justify-center max-[720px]:px-3 max-[720px]:py-2.5"
                  onClick={() => setPendingDeleteListId(list.id)}
                >
                  <Trash2 aria-hidden="true" size={16} />
                  Löschen
                </AppButton>
              </div>
            </AppCard>
          ))}

          {lists.length === 0 ? (
            <AppCard className="flex min-h-[11rem] flex-col items-center justify-center gap-3 border-dashed border-[rgba(24,52,47,0.18)] bg-[rgba(255,250,244,0.78)] p-4 text-center text-[rgba(24,52,47,0.6)]">
              <ShoppingCart aria-hidden="true" size={28} />
              <div className="grid gap-1">
                <strong className="text-[#18342f]">Noch keine Einkaufsliste</strong>
                <span>Erstelle eine Liste und fuege Artikel spaeter per Enter hinzu.</span>
              </div>
            </AppCard>
          ) : null}
        </div>
      </div>

      {openList ? (
        <ModalDialog
          id="shopping-list-open-title"
          title={openList.title}
          eyebrow={formatListDate(openList.date)}
          actions={(
            <AppButton type="button" variant="secondary" onClick={() => setOpenListId(null)}>
              Schließen
            </AppButton>
          )}
        >
          <div className="grid gap-3">
            <p className="m-0 rounded-[18px] bg-[rgba(25,98,77,0.08)] px-4 py-3 text-[rgba(24,52,47,0.72)]">
              {getOpenItemCount(openList)} von {openList.items.length} Artikeln sind noch offen.
            </p>

            <ul className="check-list">
              {openList.items.map((item) => (
                <li key={item.id} className={item.checked ? '[&>label>span]:opacity-60 [&>label>span]:line-through [&_small]:opacity-60' : ''}>
                  <label>
                    <input
                      type="checkbox"
                      className={appCheckboxClassName()}
                      checked={item.checked}
                      onChange={() => void onToggleItem(openList.id, item.id, !item.checked)}
                    />
                    <span>{item.name}</span>
                  </label>
                  {item.quantity ? <small>{item.quantity}</small> : null}
                </li>
              ))}
            </ul>
          </div>
        </ModalDialog>
      ) : null}

      {editorState ? (
        <ModalDialog
          id="shopping-list-editor-title"
          title={editorState.mode === 'edit' ? 'Einkaufsliste bearbeiten' : 'Neue Einkaufsliste'}
          eyebrow="Datum und Artikel"
          className="w-[min(640px,100%)]"
          actions={(
            <>
              <AppButton type="button" variant="secondary" onClick={resetEditor}>
                Abbrechen
              </AppButton>
              <AppButton type="button" variant="primary" onClick={() => void handleSaveList()}>
                {editorState.mode === 'edit' ? 'Liste speichern' : 'Liste anlegen'}
              </AppButton>
            </>
          )}
        >
          <div className="grid gap-4 max-[720px]:gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.62)]">Listenname</span>
                <input
                  className={appInputClassName()}
                  value={draftList.title}
                  onChange={(event) => updateDraftField('title', event.currentTarget.value)}
                  placeholder="z. B. Wocheneinkauf"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.62)]">Datum</span>
                <input
                  className={appInputClassName()}
                  type="date"
                  value={draftList.date}
                  onChange={(event) => updateDraftField('date', event.currentTarget.value)}
                />
              </label>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-[rgba(24,52,47,0.1)] bg-[rgba(255,255,255,0.62)] p-4 max-[720px]:p-3.5">
              <div className="grid gap-1">
                <h4 className="m-0 text-[1.05rem] font-semibold text-[#18342f]">Artikel schnell erfassen</h4>
                <p className="m-0 text-[0.88rem] text-[rgba(24,52,47,0.62)]">
                  Tippe einen Artikel ein und bestaetige mit Enter. Mengen werden vorne automatisch erkannt.
                </p>
              </div>

              <label className="grid gap-2">
                <span className="text-[0.8rem] text-[rgba(24,52,47,0.62)]">Neuer Artikel</span>
                <input
                  ref={quickAddInputRef}
                  className={appInputClassName()}
                  value={quickAddItemText}
                  onChange={(event) => setQuickAddItemText(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') {
                      return;
                    }

                    event.preventDefault();
                    handleQuickAddItem();
                  }}
                  placeholder="z. B. 2 Wasser oder 200 gram Reis"
                />
              </label>

              {draftList.items.length > 0 ? (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-[#18342f]">Erfasste Artikel</strong>
                    <span className="text-[0.82rem] text-[rgba(24,52,47,0.58)]">{draftList.items.length} Eintraege</span>
                  </div>

                  <div className="grid gap-2 max-h-[min(40vh,18rem)] overflow-y-auto pr-1">
                    {draftList.items.map((item) => (
                      <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[18px] border border-[rgba(24,52,47,0.08)] bg-[rgba(255,250,244,0.88)] p-2.5">
                        <input
                          className={appInputClassName('min-h-[2.9rem] rounded-[14px] px-3 py-2 text-[0.95rem]')}
                          value={item.text}
                          onChange={(event) => updateDraftItemText(item.id, event.currentTarget.value)}
                          placeholder="Artikel eingeben"
                        />

                        <AppButton
                          type="button"
                          variant="danger"
                          size="icon"
                          className="size-[2.4rem]"
                          onClick={() => removeDraftItem(item.id)}
                          aria-label={`Artikel ${item.text || 'ohne Namen'} entfernen`}
                        >
                          <Trash2 aria-hidden="true" size={15} />
                        </AppButton>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="m-0 rounded-[18px] border border-dashed border-[rgba(24,52,47,0.12)] bg-[rgba(255,250,244,0.74)] px-4 py-3 text-[0.9rem] text-[rgba(24,52,47,0.6)]">
                  Noch keine Artikel erfasst. Nutze das Eingabefeld und druecke Enter.
                </p>
              )}
            </div>

            {validationMessage ? (
              <p className="m-0 rounded-[18px] bg-[rgba(165,71,34,0.12)] px-4 py-3 text-[#8f3415]">{validationMessage}</p>
            ) : null}
          </div>
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