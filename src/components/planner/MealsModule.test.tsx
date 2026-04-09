import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { plannerFixture } from './planner-test-fixtures';
import { MealsModule } from './MealsModule';

describe('MealsModule', () => {
  it('renders meals, submits the form, and toggles prepared status', async () => {
    const user = userEvent.setup();
    const onAddMeal = vi.fn().mockResolvedValue(undefined);
    const onToggleMealPrepared = vi.fn().mockResolvedValue(undefined);

    render(
      <MealsModule
        activeTab="meals"
        meals={plannerFixture.meals}
        onAddMeal={onAddMeal}
        onToggleMealPrepared={onToggleMealPrepared}
      />,
    );

    await user.type(screen.getByPlaceholderText('Wochentag'), 'Dienstag');
    await user.type(screen.getByPlaceholderText('Gericht'), 'Suppe');
    await user.click(screen.getByRole('button', { name: 'Gericht speichern' }));
    await user.click(screen.getByRole('button', { name: 'Planen' }));

    expect(onAddMeal).toHaveBeenCalled();
    expect(onToggleMealPrepared).toHaveBeenCalledWith('meal-1', true);
  });
});