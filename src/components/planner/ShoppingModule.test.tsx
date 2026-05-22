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
    const cardsGrid = screen.getByRole('button', { name: /Wocheneinkauf/i }).closest('article')?.parentElement;

    expect(moduleStack).toHaveClass('content-start', 'gap-4');
    expect(cardsGrid).toHaveClass('gap-4', 'max-[720px]:gap-3');
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
    await user.type(screen.getAllByPlaceholderText('Artikel')[0], 'Brot');
    await user.type(screen.getByPlaceholderText('Anzahl'), '1');
    await user.click(screen.getByRole('button', { name: 'Liste anlegen' }));

    expect(onCreateList).toHaveBeenCalledWith({
      title: 'Supermarkt',
      date: '2026-05-06',
      items: [
        expect.objectContaining({
          name: 'Brot',
          quantity: '1',
          checked: false,
        }),
      ],
    });

    await user.click(screen.getByRole('button', { name: /Wocheneinkauf/i }));
    expect(screen.getByRole('checkbox', { name: 'Milch' })).not.toHaveClass('app-switch');
    await user.click(screen.getByRole('checkbox', { name: 'Milch' }));

    expect(onToggleItem).toHaveBeenCalledWith('shopping-list-1', 'shopping-1', true);
  });
});