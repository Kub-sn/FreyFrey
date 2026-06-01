import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActiveTabProvider } from '../../context/ActiveTabContext';
import { plannerFixture } from './planner-test-fixtures';
import { MealsModule } from './MealsModule';

function renderMealsModule(options?: {
  onCreateMeal?: ReturnType<typeof vi.fn>;
  onDeleteMeal?: ReturnType<typeof vi.fn>;
  isMobileOverride?: boolean;
}) {
  const onCreateMeal = options?.onCreateMeal ?? vi.fn().mockResolvedValue(true);
  const onDeleteMeal = options?.onDeleteMeal ?? vi.fn().mockResolvedValue(true);

  render(
    <ActiveTabProvider activeTab="meals" setActiveTab={vi.fn()}>
      <MealsModule
        meals={plannerFixture.meals}
        onCreateMeal={onCreateMeal}
        onDeleteMeal={onDeleteMeal}
        referenceDate={new Date('2026-06-03T12:00:00')}
        isMobileOverride={options?.isMobileOverride}
      />
    </ActiveTabProvider>,
  );

  return { onCreateMeal, onDeleteMeal };
}

describe('MealsModule', () => {
  it('opens a day from the two-week calendar and saves a meal from the dialog', async () => {
    const user = userEvent.setup();
    const { onCreateMeal } = renderMealsModule();

    expect(screen.queryByRole('heading', { level: 4, name: 'Essenskalender' })).not.toBeInTheDocument();
    expect(screen.getByText('Nudeln')).toBeInTheDocument();
    expect(screen.queryByText('Mit Tomatensauce.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Essensplan für Dienstag, 2. Juni 2026 öffnen' }));

    expect(screen.getByRole('heading', { level: 3, name: 'Gerichte für Dienstag, 2. Juni' })).toBeInTheDocument();
    expect(screen.getByText('Mit Tomatensauce.')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Gerichtname'), 'Suppe');
    await user.type(screen.getByPlaceholderText('Rezept'), 'Mit Brot servieren');
    await user.click(screen.getByRole('button', { name: 'Gericht speichern' }));

    expect(onCreateMeal).toHaveBeenCalledWith({
      date: '2026-06-02',
      name: 'Suppe',
      recipe: 'Mit Brot servieren',
    });
  });

  it('switches between the available calendar views', async () => {
    const user = userEvent.setup();

    renderMealsModule();

    expect(screen.queryByText('Essensplan')).not.toBeInTheDocument();
    expect(screen.queryByText('Immer die aktuelle Woche plus die nächste Woche.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Monat' }));
    expect(screen.getByRole('button', { name: 'Monat' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Woche' }));
    expect(screen.getByRole('button', { name: 'Woche' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a single mobile week and navigates with arrows', async () => {
    const user = userEvent.setup();

    renderMealsModule({ isMobileOverride: true });

    expect(screen.queryByRole('button', { name: 'Monat' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nächste Woche anzeigen' })).toHaveClass('size-[3rem]');
    expect(screen.getByRole('button', { name: 'Nächste Woche anzeigen' }).querySelector('svg')).toHaveClass('size-8');
    expect(screen.getAllByRole('button', { name: /Essensplan für/i })).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'Essensplan für Dienstag, 2. Juni 2026 öffnen' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nächste Woche anzeigen' }));

    expect(screen.queryByRole('button', { name: 'Essensplan für Dienstag, 2. Juni 2026 öffnen' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Essensplan für Dienstag, 9. Juni 2026 öffnen' })).toBeInTheDocument();
  });

  it('deletes a meal from the dialog', async () => {
    const user = userEvent.setup();
    const onDeleteMeal = vi.fn().mockResolvedValue(true);

    renderMealsModule({ onDeleteMeal });

    await user.click(screen.getByRole('button', { name: 'Essensplan für Dienstag, 2. Juni 2026 öffnen' }));
    const deleteButton = screen.getByRole('button', { name: 'Gericht Nudeln löschen' });

    expect(deleteButton).toHaveClass('size-[2.85rem]');
    expect(deleteButton.querySelector('svg')).toHaveClass('size-5');

    await user.click(deleteButton);

    expect(onDeleteMeal).toHaveBeenCalledWith('meal-1');
  });

  it('uses the full-width meal layout container on desktop', () => {
    renderMealsModule();

    expect(document.querySelector('.module.meals-module.is-visible')).toBeInTheDocument();
    expect(document.querySelector('.module-layout.meals-module-layout')).toBeInTheDocument();
    expect(document.querySelector('.module-layout.meals-module-layout > .panel')).not.toBeInTheDocument();
    expect(document.querySelector('.module-layout.meals-module-layout > .meals-module-content')).toBeInTheDocument();
  });
});