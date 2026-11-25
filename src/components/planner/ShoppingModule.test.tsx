import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ActiveTabProvider } from '../../context/ActiveTabContext';
import type { ShoppingList, ShoppingListItem } from '../../lib/planner-data';
import { plannerFixture } from './planner-test-fixtures';
import { ShoppingModule } from './ShoppingModule';

type ShoppingModuleProps = Parameters<typeof ShoppingModule>[0];

function renderShoppingModule(overrides: Partial<ShoppingModuleProps> = {}) {
  const props: ShoppingModuleProps = {
    lists: plannerFixture.shoppingLists,
    onCreateList: vi.fn().mockResolvedValue(null),
    onUpdateList: vi.fn().mockResolvedValue(true),
    onDeleteList: vi.fn().mockResolvedValue(true),
    onCreateItem: vi.fn().mockResolvedValue(null),
    onToggleItem: vi.fn().mockResolvedValue(undefined),
    onDeleteItem: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  render(
    <ActiveTabProvider activeTab="shopping" setActiveTab={vi.fn()}>
      <ShoppingModule {...props} />
    </ActiveTabProvider>,
  );

  return props;
}

function StatefulShoppingModule({
  onCreateList,
  onCreateItem,
}: {
  onCreateList: (payload: Omit<ShoppingList, 'id'>) => void;
  onCreateItem: (listId: string, payload: Pick<ShoppingListItem, 'name' | 'quantity'>) => void;
}) {
  const [lists, setLists] = useState<ShoppingList[]>(plannerFixture.shoppingLists);

  return (
    <ActiveTabProvider activeTab="shopping" setActiveTab={vi.fn()}>
      <ShoppingModule
        lists={lists}
        onCreateList={async (payload) => {
          onCreateList(payload);
          const createdList = { id: 'shopping-list-new', ...payload };
          setLists((current) => [createdList, ...current]);
          return createdList;
        }}
        onUpdateList={vi.fn().mockResolvedValue(true)}
        onDeleteList={vi.fn().mockResolvedValue(true)}
        onCreateItem={async (listId, payload) => {
          onCreateItem(listId, payload);
          const createdItem = { id: `item-${payload.name}`, ...payload, checked: false };
          setLists((current) => current.map((list) => (
            list.id === listId ? { ...list, items: [createdItem, ...list.items] } : list
          )));
          return createdItem;
        }}
        onToggleItem={vi.fn().mockResolvedValue(undefined)}
        onDeleteItem={vi.fn().mockResolvedValue(undefined)}
      />
    </ActiveTabProvider>
  );
}

describe('ShoppingModule', () => {
  it('keeps the create action and shopping cards anchored at the top of the module stack', () => {
    renderShoppingModule();

    const createButton = screen.getByRole('button', { name: 'Liste erstellen' });
    const moduleStack = createButton.closest('div')?.parentElement;
    const cardsGrid = screen.getByText('Wocheneinkauf').closest('button')?.closest('article')?.parentElement;

    expect(moduleStack).toHaveClass('content-start', 'gap-4');
    expect(cardsGrid).toHaveClass('gap-4', 'max-mobile:gap-3');
  });

  it('creates a list with only name and date, then opens the list dialog to add items', async () => {
    const user = userEvent.setup();
    const onCreateList = vi.fn();
    const onCreateItem = vi.fn();

    render(<StatefulShoppingModule onCreateList={onCreateList} onCreateItem={onCreateItem} />);

    await user.click(screen.getByRole('button', { name: 'Liste erstellen' }));

    const createDialog = screen.getByRole('dialog', { name: 'Neue Einkaufsliste' });
    expect(within(createDialog).queryByLabelText('Artikel hinzufügen')).not.toBeInTheDocument();

    await user.type(within(createDialog).getByLabelText('Listenname'), 'Supermarkt');
    await user.clear(within(createDialog).getByLabelText('Datum'));
    await user.type(within(createDialog).getByLabelText('Datum'), '2026-05-06');
    await user.click(within(createDialog).getByRole('button', { name: 'Liste erstellen' }));

    expect(onCreateList).toHaveBeenCalledWith({
      title: 'Supermarkt',
      date: '2026-05-06',
      items: [],
    });

    const listDialog = await screen.findByRole('dialog', { name: 'Supermarkt' });
    expect(screen.queryByRole('dialog', { name: 'Neue Einkaufsliste' })).not.toBeInTheDocument();

    const quickAddInput = within(listDialog).getByLabelText('Artikel hinzufügen');
    await waitFor(() => expect(quickAddInput).toHaveFocus());

    await user.type(quickAddInput, '2 Brot{Enter}');
    expect(onCreateItem).toHaveBeenCalledWith('shopping-list-new', { name: 'Brot', quantity: '2' });
    expect(quickAddInput).toHaveValue('');
    await waitFor(() => expect(quickAddInput).toHaveFocus());

    await user.type(quickAddInput, 'Toilettenpapier{Enter}');
    expect(onCreateItem).toHaveBeenCalledWith('shopping-list-new', { name: 'Toilettenpapier', quantity: undefined });

    expect(within(listDialog).getByRole('checkbox', { name: /Brot/ })).toBeInTheDocument();
    expect(within(listDialog).getByRole('checkbox', { name: /Toilettenpapier/ })).toBeInTheDocument();
  });

  it('assigns a default title when a new list is created without a name', async () => {
    const user = userEvent.setup();
    const onCreateList = vi.fn().mockResolvedValue(null);

    renderShoppingModule({ onCreateList });

    await user.click(screen.getByRole('button', { name: 'Liste erstellen' }));
    const createDialog = screen.getByRole('dialog', { name: 'Neue Einkaufsliste' });
    await user.clear(within(createDialog).getByLabelText('Datum'));
    await user.type(within(createDialog).getByLabelText('Datum'), '2026-05-06');
    await user.click(within(createDialog).getByRole('button', { name: 'Liste erstellen' }));

    expect(onCreateList).toHaveBeenCalledWith({
      title: 'Einkaufsliste 1',
      date: '2026-05-06',
      items: [],
    });
    // Creation failed (null), so the create dialog stays open and no list dialog opens.
    expect(screen.getByRole('dialog', { name: 'Neue Einkaufsliste' })).toBeInTheDocument();
  });

  it('requires a date when creating a list', async () => {
    const user = userEvent.setup();
    const onCreateList = vi.fn();

    renderShoppingModule({ onCreateList });

    await user.click(screen.getByRole('button', { name: 'Liste erstellen' }));
    const createDialog = screen.getByRole('dialog', { name: 'Neue Einkaufsliste' });
    await user.clear(within(createDialog).getByLabelText('Datum'));
    await user.click(within(createDialog).getByRole('button', { name: 'Liste erstellen' }));

    expect(onCreateList).not.toHaveBeenCalled();
    expect(within(createDialog).getByText('Bitte wähle ein Datum für die Einkaufsliste.')).toBeInTheDocument();
  });

  it('adds, toggles and deletes items from the open list dialog', async () => {
    const user = userEvent.setup();
    const onCreateItem = vi.fn().mockResolvedValue({ id: 'shopping-2', name: 'Eier', quantity: '3', checked: false });
    const onToggleItem = vi.fn().mockResolvedValue(undefined);
    const onDeleteItem = vi.fn().mockResolvedValue(undefined);

    renderShoppingModule({ onCreateItem, onToggleItem, onDeleteItem });

    await user.click(screen.getByText('Wocheneinkauf').closest('button') as HTMLButtonElement);

    const listDialog = screen.getByRole('dialog', { name: 'Wocheneinkauf' });
    const quickAddInput = within(listDialog).getByLabelText('Artikel hinzufügen');
    await user.type(quickAddInput, '3 Eier{Enter}');

    expect(onCreateItem).toHaveBeenCalledWith('shopping-list-1', { name: 'Eier', quantity: '3' });
    expect(quickAddInput).toHaveValue('');

    const milkCheckbox = within(listDialog).getByRole('checkbox', { name: /Milch/i });
    expect(milkCheckbox).toHaveClass('app-checkbox', 'checkbox');
    await user.click(milkCheckbox);
    expect(onToggleItem).toHaveBeenCalledWith('shopping-list-1', 'shopping-1', true);

    await user.click(within(listDialog).getByRole('button', { name: 'Artikel Milch löschen' }));
    expect(onDeleteItem).toHaveBeenCalledWith('shopping-list-1', 'shopping-1');
  });

  it('keeps the quick add text when adding an item fails', async () => {
    const user = userEvent.setup();
    const onCreateItem = vi.fn().mockResolvedValue(null);

    renderShoppingModule({ onCreateItem });

    await user.click(screen.getByText('Wocheneinkauf').closest('button') as HTMLButtonElement);
    const quickAddInput = screen.getByLabelText('Artikel hinzufügen');
    await user.type(quickAddInput, 'Butter{Enter}');

    expect(onCreateItem).toHaveBeenCalledTimes(1);
    expect(quickAddInput).toHaveValue('Butter');
  });

  it('creates an item only once on a fast double Enter', async () => {
    const user = userEvent.setup();
    let resolveCreate!: (value: ShoppingListItem | null) => void;
    const onCreateItem = vi.fn(() => new Promise<ShoppingListItem | null>((resolve) => {
      resolveCreate = resolve;
    }));

    renderShoppingModule({ onCreateItem });

    await user.click(screen.getByText('Wocheneinkauf').closest('button') as HTMLButtonElement);
    const quickAddInput = screen.getByLabelText('Artikel hinzufügen');

    await user.type(quickAddInput, '3 Eier{Enter}{Enter}');

    expect(onCreateItem).toHaveBeenCalledTimes(1);
    expect(quickAddInput).toHaveValue('');

    await act(async () => {
      resolveCreate({ id: 'shopping-2', name: 'Eier', quantity: '3', checked: false });
    });
    expect(onCreateItem).toHaveBeenCalledTimes(1);
  });

  it('edits only name and date without sending items', async () => {
    const user = userEvent.setup();
    const onUpdateList = vi.fn().mockResolvedValue(true);

    renderShoppingModule({ onUpdateList });

    await user.click(screen.getByRole('button', { name: 'Einkaufsliste Wocheneinkauf Aktionen' }));
    await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));

    const editDialog = screen.getByRole('dialog', { name: 'Einkaufsliste bearbeiten' });
    expect(within(editDialog).queryByLabelText('Artikel hinzufügen')).not.toBeInTheDocument();

    const titleInput = within(editDialog).getByLabelText('Listenname');
    expect(titleInput).toHaveValue('Wocheneinkauf');
    await user.clear(titleInput);
    await user.type(titleInput, 'Markt');
    await user.click(within(editDialog).getByRole('button', { name: 'Liste speichern' }));

    expect(onUpdateList).toHaveBeenCalledWith('shopping-list-1', {
      title: 'Markt',
      date: '2026-05-04',
    });
    expect(screen.queryByRole('dialog', { name: 'Einkaufsliste bearbeiten' })).not.toBeInTheDocument();
  });

  it('requires a name when editing a list', async () => {
    const user = userEvent.setup();
    const onUpdateList = vi.fn();

    renderShoppingModule({ onUpdateList });

    await user.click(screen.getByRole('button', { name: 'Einkaufsliste Wocheneinkauf Aktionen' }));
    await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));

    const editDialog = screen.getByRole('dialog', { name: 'Einkaufsliste bearbeiten' });
    await user.clear(within(editDialog).getByLabelText('Listenname'));
    await user.click(within(editDialog).getByRole('button', { name: 'Liste speichern' }));

    expect(onUpdateList).not.toHaveBeenCalled();
    expect(within(editDialog).getByText('Bitte gib einen Namen für die Einkaufsliste ein.')).toBeInTheDocument();
  });
});
