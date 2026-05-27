import { useState, type FormEvent } from 'react';
import type { PlannerState } from '../../lib/planner-data';
import { useActiveTab } from '../../context/ActiveTabContext';
import { validateRequiredFields, type FieldErrors } from '../../lib/form-validation';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { appInputClassName } from '../ui/AppField';
import { FieldError } from './FieldError';

export function MealsModule({
  meals,
  onAddMeal,
  onToggleMealPrepared,
}: {
  meals: PlannerState['meals'];
  onAddMeal: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleMealPrepared: (id: string, prepared: boolean) => Promise<void>;
}) {
  const { activeTab } = useActiveTab();
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget);
    const next = validateRequiredFields(form, [
      { name: 'day', label: 'Wochentag' },
      { name: 'meal', label: 'Gericht' },
    ]);
    if (Object.keys(next).length > 0) {
      event.preventDefault();
      setErrors(next);
      return;
    }
    setErrors({});
    void onAddMeal(event);
  };

  const clearFieldError = (name: string) =>
    setErrors((current) => {
      if (!current[name]) return current;
      const { [name]: _removed, ...rest } = current;
      return rest;
    });

  return (
    <section className={activeTab === 'meals' ? 'module is-visible' : 'module'}>
      <div className="module-layout">
        <AppCard as="form" className="form-panel" onSubmit={handleSubmit} noValidate>
          <h4>Gericht eintragen</h4>
          <input
            className={appInputClassName()}
            name="day"
            placeholder="Wochentag"
            aria-invalid={errors.day ? 'true' : undefined}
            aria-describedby={errors.day ? 'day-error' : undefined}
            onInput={() => clearFieldError('day')}
          />
          <FieldError fieldName="day" message={errors.day} />
          <input
            className={appInputClassName()}
            name="meal"
            placeholder="Gericht"
            aria-invalid={errors.meal ? 'true' : undefined}
            aria-describedby={errors.meal ? 'meal-error' : undefined}
            onInput={() => clearFieldError('meal')}
          />
          <FieldError fieldName="meal" message={errors.meal} />
          <AppButton type="submit" variant="primary">Gericht speichern</AppButton>
        </AppCard>
        <AppCard className="self-start">
          <ul className="meal-list">
            {meals.length > 0 ? meals.map((meal) => (
              <li key={meal.id} className={meal.prepared ? 'done' : ''}>
                <AppButton
                  type="button"
                  variant="ghost"
                  onClick={() => void onToggleMealPrepared(meal.id, !meal.prepared)}
                >
                  {meal.prepared ? 'Bereit' : 'Planen'}
                </AppButton>
                <div>
                  <strong>{meal.day}</strong>
                  <small>{meal.meal}</small>
                </div>
              </li>
            )) : null}
            {meals.length === 0 ? <li className="py-3 text-[rgba(24,52,47,0.55)] italic border-none list-none">Keine Gerichte vorhanden</li> : null}
          </ul>
        </AppCard>
      </div>
    </section>
  );
}