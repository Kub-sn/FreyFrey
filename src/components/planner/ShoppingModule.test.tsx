import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { plannerFixture } from './planner-test-fixtures';
import { ShoppingModule } from './ShoppingModule';

describe('ShoppingModule', () => {
  it('renders items, submits the form, and toggles a shopping item', async () => {
    const user = userEvent.setup();
    const onAddShopping = vi.fn().mockResolvedValue(undefined);
    const onToggleShopping = vi.fn().mockResolvedValue(undefined);

    render(
      <ShoppingModule
        activeTab="shopping"
        items={plannerFixture.shoppingItems}
        onAddShopping={onAddShopping}
        onToggleShopping={onToggleShopping}
      />,
    );

    await user.type(screen.getByPlaceholderText('Artikel'), 'Brot');
    await user.type(screen.getByPlaceholderText('Menge'), '1');
    await user.type(screen.getByPlaceholderText('Kategorie'), 'Bäckerei');
    await user.click(screen.getByRole('button', { name: 'Artikel speichern' }));
    await user.click(screen.getByRole('checkbox'));

    expect(onAddShopping).toHaveBeenCalled();
    expect(onToggleShopping).toHaveBeenCalledWith('shopping-1', true);
  });
});