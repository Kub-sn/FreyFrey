import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActiveTabProvider } from '../../context/ActiveTabContext';
import { plannerFixture } from './planner-test-fixtures';
import { ShoppingModule } from './ShoppingModule';

describe('ShoppingModule', () => {
  it('keeps the create action and shopping cards anchored at the top of the module stack', () => {
    render(
      <ActiveTabProvider activeTab="shopping" setActiveTab={vi.fn()}>
        <ShoppingModule
          lists={plannerFixture.shoppingLists}
          onCreateList={vi.fn().mockResolvedValue(true)}
          onDeleteList={vi.fn().mockResolvedValue(true)}
          onToggleItem={vi.fn().mockResolvedValue(undefined)}
          onUpdateList={vi.fn().mockResolvedValue(true)}
        />
      </ActiveTabProvider>,
    );

    const createButton = screen.getByRole('button', { name: 'Liste erstellen' });
    const moduleStack = createButton.closest('div')?.parentElement;
    const cardsGrid = screen.getByText('Wocheneinkauf').closest('button')?.closest('article')?.parentElement;

    expect(moduleStack).toHaveClass('content-start', 'gap-4');
    expect(cardsGrid).toHaveClass('gap-4', 'max-mobile:gap-3');
  });

  it('creates a list, opens a list dialog, and toggles an item', async () => {
    const user = userEvent.setup();
    const onCreateList = vi.fn().mockResolvedValue(true);
    const onDeleteList = vi.fn().mockResolvedValue(true);
    const onToggleItem = vi.fn().mockResolvedValue(undefined);
    const onUpdateList = vi.fn().mockResolvedValue(true);

    render(
      <ActiveTabProvider activeTab="shopping" setActiveTab={vi.fn()}>
        <ShoppingModule
          lists={plannerFixture.shoppingLists}
          onCreateList={onCreateList}
          onDeleteList={onDeleteList}
          onToggleItem={onToggleItem}
          onUpdateList={onUpdateList}
        />
      </ActiveTabProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Liste erstellen' }));
    await user.type(screen.getByPlaceholderText('z. B. Wocheneinkauf'), 'Supermarkt');
    await user.clear(screen.getByLabelText('Datum'));
    await user.type(screen.getByLabelText('Datum'), '2026-05-06');

    const quickAddInput = screen.getByLabelText('Neuer Artikel');

    await user.type(quickAddInput, '2 Brot{Enter}');
    expect(quickAddInput).toHaveValue('');
    expect(quickAddInput).toHaveFocus();

    await user.type(quickAddInput, 'Toilettenpapier{Enter}');

    expect(screen.getByDisplayValue('2 Brot')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Toilettenpapier')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Liste anlegen' }));

    expect(onCreateList).toHaveBeenCalledWith({
      title: 'Supermarkt',
      date: '2026-05-06',
      items: [
        expect.objectContaining({
          name: 'Toilettenpapier',
          quantity: undefined,
          checked: false,
        }),
        expect.objectContaining({
          name: 'Brot',
          quantity: '2',
          checked: false,
        }),
      ],
    });

    await user.click(screen.getByRole('button', { name: /Einkaufsliste Wocheneinkauf Aktionen/i }));
    expect(screen.getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Löschen' })).toBeInTheDocument();

    await user.click(screen.getByText('Wocheneinkauf').closest('button') as HTMLButtonElement);
    expect(screen.getByRole('checkbox', { name: /Milch/i })).toHaveClass('app-checkbox', 'checkbox');
    expect(screen.getByText('2')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Milch/i }));

    expect(onToggleItem).toHaveBeenCalledWith('shopping-list-1', 'shopping-1', true);
  });

  it('adds an item directly from the open list dialog', async () => {
    const user = userEvent.setup();
    const onUpdateList = vi.fn().mockResolvedValue(true);

    render(
      <ActiveTabProvider activeTab="shopping" setActiveTab={vi.fn()}>
        <ShoppingModule
          lists={plannerFixture.shoppingLists}
          onCreateList={vi.fn().mockResolvedValue(true)}
          onDeleteList={vi.fn().mockResolvedValue(true)}
          onToggleItem={vi.fn().mockResolvedValue(undefined)}
          onUpdateList={onUpdateList}
        />
      </ActiveTabProvider>,
    );

    await user.click(screen.getByText('Wocheneinkauf').closest('button') as HTMLButtonElement);

    const quickAddInput = screen.getByLabelText('Artikel hinzufügen');
    await user.type(quickAddInput, '3 Eier{Enter}');

    expect(onUpdateList).toHaveBeenCalledWith('shopping-list-1', {
      title: 'Wocheneinkauf',
      date: '2026-05-04',
      items: [
        expect.objectContaining({ name: 'Eier', quantity: '3', checked: false }),
        { id: 'shopping-1', name: 'Milch', quantity: '2', checked: false },
      ],
    });

    expect(quickAddInput).toHaveValue('');
  });

  it('assigns a default title when a new list is created without a name', async () => {
    const user = userEvent.setup();
    const onCreateList = vi.fn().mockResolvedValue(true);

    render(
      <ActiveTabProvider activeTab="shopping" setActiveTab={vi.fn()}>
        <ShoppingModule
          lists={plannerFixture.shoppingLists}
          onCreateList={onCreateList}
          onDeleteList={vi.fn().mockResolvedValue(true)}
          onToggleItem={vi.fn().mockResolvedValue(undefined)}
          onUpdateList={vi.fn().mockResolvedValue(true)}
        />
      </ActiveTabProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Liste erstellen' }));
    await user.clear(screen.getByLabelText('Datum'));
    await user.type(screen.getByLabelText('Datum'), '2026-05-06');

    const quickAddInput = screen.getByLabelText('Neuer Artikel');
    await user.type(quickAddInput, 'Milch{Enter}');
    await user.click(screen.getByRole('button', { name: 'Liste anlegen' }));

    expect(onCreateList).toHaveBeenCalledWith({
      title: 'Einkaufsliste 1',
      date: '2026-05-06',
      items: [
        expect.objectContaining({
          name: 'Milch',
          quantity: undefined,
          checked: false,
        }),
      ],
    });
  });
});