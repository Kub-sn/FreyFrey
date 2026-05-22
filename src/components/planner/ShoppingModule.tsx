import { CalendarDays, Pencil, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PlannerState, ShoppingList, ShoppingListItem } from '../../lib/planner-data';
import { useActiveTab } from '../../context/ActiveTabContext';
import { nextStringId } from '../../lib/id';
import { ConfirmationDialog } from './ConfirmationDialog';
import { ModalDialog } from './ModalDialog';

type ShoppingListDraft = {
  title: string;
  date: string;
  items: ShoppingListItem[];
};

function createDraftItem(): ShoppingListItem {
  return {
    id: nextStringId(),
    name: '',
    quantity: '',
    checked: false,
  };
}

function createDraftList(): ShoppingListDraft {
  return {
    title: '',
    date: new Date().toISOString().slice(0, 10),
    items: [createDraftItem()],
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
    setValidationMessage(null);
    setEditorState(null);
  };

  const openCreateDialog = () => {
    setDraftList(createDraftList());
    setValidationMessage(null);
    setEditorState({ mode: 'create' });
  };

  const openEditDialog = (list: ShoppingList) => {
    setDraftList({
      title: list.title,
      date: list.date,
      items: list.items.map((item) => ({ ...item })),
    });
    setValidationMessage(null);
    setEditorState({ mode: 'edit', listId: list.id });
  };

  const updateDraftField = (field: keyof Omit<ShoppingListDraft, 'items'>, value: string) => {
    setDraftList((current) => ({ ...current, [field]: value }));
  };

  const updateDraftItem = (itemId: string, field: keyof Omit<ShoppingListItem, 'id'>, value: string) => {
    setDraftList((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addDraftItem = () => {
    setDraftList((current) => ({
      ...current,
      items: [...current.items, createDraftItem()],
    }));
  };

  const removeDraftItem = (itemId: string) => {
    setDraftList((current) => {
      const nextItems = current.items.filter((item) => item.id !== itemId);

      return {
        ...current,
        items: nextItems.length > 0 ? nextItems : [createDraftItem()],
      };
    });
  };

  const handleSaveList = async () => {
    const normalizedItems = draftList.items
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        quantity: item.quantity.trim(),
      }))
      .filter((item) => item.name || item.quantity);

    if (!draftList.title.trim()) {
      setValidationMessage('Bitte gib der Einkaufsliste einen Namen.');
      return;
    }

    if (!draftList.date) {
      setValidationMessage('Bitte wähle ein Datum für die Einkaufsliste.');
      return;
    }

    if (normalizedItems.length === 0 || normalizedItems.some((item) => !item.name || !item.quantity)) {
      setValidationMessage('Jeder Artikel braucht Name und Anzahl.');
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
        <div className="flex items-start">
          <button
            type="button"
            className="secondary-action inline-flex items-center gap-2.5 rounded-[18px] border-[rgba(25,98,77,0.18)] bg-[rgba(255,250,244,0.96)] px-4 py-3 font-semibold text-[#19624d] shadow-[0_16px_32px_rgba(24,52,47,0.08)] hover:bg-[rgba(243,249,246,0.98)]"
            onClick={openCreateDialog}
          >
            <Plus aria-hidden="true" size={18} strokeWidth={2.4} />
            <span>Liste erstellen</span>
          </button>
        </div>

        <div className="grid gap-4 max-[720px]:gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lists.map((list) => (
            <article
              key={list.id}
              className="panel flex min-h-[15rem] flex-col gap-4 border border-[rgba(24,52,47,0.1)] bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(247,241,231,0.96))]"
            >
              <button
                type="button"
                className="grid gap-4 text-left"
                onClick={() => setOpenListId(list.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-2">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(25,98,77,0.14)] bg-[rgba(255,255,255,0.66)] px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.66)]">
                      <CalendarDays aria-hidden="true" size={14} />
                      <span>{formatListDate(list.date)}</span>
                    </div>
                    <h4 className="m-0 text-[1.2rem] font-semibold leading-tight text-[#18342f]">{list.title}</h4>
                  </div>

                  <div className="rounded-[18px] bg-[rgba(25,98,77,0.08)] px-3 py-2 text-right">
                    <strong className="block text-[1.1rem] text-[#19624d]">{list.items.length}</strong>
                    <small className="text-[rgba(24,52,47,0.62)]">Artikel</small>
                  </div>
                </div>

                <div className="grid gap-3 rounded-[22px] border border-[rgba(24,52,47,0.08)] bg-[rgba(255,255,255,0.68)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.62)]">
                      <ShoppingCart aria-hidden="true" size={15} />
                      Einkaufsliste
                    </span>
                    <span className="chip">{getOpenItemCount(list)} offen</span>
                  </div>

                  <ul className="grid gap-2">
                    {list.items.slice(0, 3).map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 text-[0.96rem] text-[#18342f]">
                        <span className={item.checked ? 'line-through opacity-55' : ''}>{item.name}</span>
                        <small className="text-[rgba(24,52,47,0.58)]">{item.quantity}</small>
                      </li>
                    ))}
                    {list.items.length > 3 ? (
                      <li className="text-[0.84rem] text-[rgba(24,52,47,0.58)]">+ {list.items.length - 3} weitere Artikel</li>
                    ) : null}
                  </ul>
                </div>
              </button>

              <div className="mt-auto flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="secondary-action inline-flex items-center gap-2"
                  onClick={() => openEditDialog(list)}
                >
                  <Pencil aria-hidden="true" size={16} />
                  Bearbeiten
                </button>
                <button
                  type="button"
                  className="secondary-action danger-action inline-flex items-center gap-2"
                  onClick={() => setPendingDeleteListId(list.id)}
                >
                  <Trash2 aria-hidden="true" size={16} />
                  Löschen
                </button>
              </div>
            </article>
          ))}

          {lists.length === 0 ? (
            <article className="panel flex min-h-[15rem] flex-col items-center justify-center gap-3 border border-dashed border-[rgba(24,52,47,0.18)] bg-[rgba(255,250,244,0.78)] text-center text-[rgba(24,52,47,0.6)]">
              <ShoppingCart aria-hidden="true" size={28} />
              <div className="grid gap-1">
                <strong className="text-[#18342f]">Noch keine Einkaufsliste</strong>
                <span>Erstelle eine Liste mit Datum und mehreren Artikeln.</span>
              </div>
            </article>
          ) : null}
        </div>
      </div>

      {openList ? (
        <ModalDialog
          id="shopping-list-open-title"
          title={openList.title}
          eyebrow={formatListDate(openList.date)}
          actions={(
            <button type="button" className="secondary-action" onClick={() => setOpenListId(null)}>
              Schließen
            </button>
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
                      checked={item.checked}
                      onChange={() => void onToggleItem(openList.id, item.id, !item.checked)}
                    />
                    <span>{item.name}</span>
                  </label>
                  <small>
                    {item.quantity}
                  </small>
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
          className="w-[min(760px,100%)]"
          actions={(
            <>
              <button type="button" className="secondary-action" onClick={resetEditor}>
                Abbrechen
              </button>
              <button type="button" onClick={() => void handleSaveList()}>
                {editorState.mode === 'edit' ? 'Liste speichern' : 'Liste anlegen'}
              </button>
            </>
          )}
        >
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.62)]">Listenname</span>
                <input
                  value={draftList.title}
                  onChange={(event) => updateDraftField('title', event.currentTarget.value)}
                  placeholder="z. B. Wocheneinkauf"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.62)]">Datum</span>
                <input
                  type="date"
                  value={draftList.date}
                  onChange={(event) => updateDraftField('date', event.currentTarget.value)}
                />
              </label>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-[rgba(24,52,47,0.1)] bg-[rgba(255,255,255,0.62)] p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="m-0 text-[1.05rem] font-semibold text-[#18342f]">Artikel</h4>
                <button type="button" className="secondary-action inline-flex items-center gap-2" onClick={addDraftItem}>
                  <Plus aria-hidden="true" size={16} />
                  Weiteren Artikel
                </button>
              </div>

              <div className="grid gap-3">
                {draftList.items.map((item, index) => (
                  <div key={item.id} className="grid gap-3 rounded-[20px] border border-[rgba(24,52,47,0.08)] bg-[rgba(255,250,244,0.88)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-[#18342f]">Artikel {index + 1}</strong>
                      <button
                        type="button"
                        className="secondary-action danger-action"
                        onClick={() => removeDraftItem(item.id)}
                      >
                        Entfernen
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-[0.8rem] text-[rgba(24,52,47,0.62)]">Artikel</span>
                        <input
                          value={item.name}
                          onChange={(event) => updateDraftItem(item.id, 'name', event.currentTarget.value)}
                          placeholder="Artikel"
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-[0.8rem] text-[rgba(24,52,47,0.62)]">Anzahl</span>
                        <input
                          value={item.quantity}
                          onChange={(event) => updateDraftItem(item.id, 'quantity', event.currentTarget.value)}
                          placeholder="Anzahl"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
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
              <button type="button" className="secondary-action" onClick={() => setPendingDeleteListId(null)}>
                Abbrechen
              </button>
              <button type="button" className="secondary-action danger-action" onClick={() => void handleConfirmDelete()}>
                Löschen
              </button>
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