import type { FormEvent } from 'react';
import type { PlannerState } from '../../lib/planner-data';

export function MealsModule({
  activeTab,
  meals,
  onAddMeal,
  onToggleMealPrepared,
}: {
  activeTab: string;
  meals: PlannerState['meals'];
  onAddMeal: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleMealPrepared: (id: string, prepared: boolean) => Promise<void>;
}) {
  return (
    <section className={activeTab === 'meals' ? 'module is-visible' : 'module'}>
      <div className="module-layout">
        <form className="panel form-panel" onSubmit={(event) => void onAddMeal(event)}>
          <h4>Gericht eintragen</h4>
          <input name="day" placeholder="Wochentag" />
          <input name="meal" placeholder="Gericht" />
          <button type="submit">Gericht speichern</button>
        </form>
        <article className="panel list-panel">
          <ul className="meal-list">
            {meals.length > 0 ? meals.map((meal) => (
              <li key={meal.id} className={meal.prepared ? 'done' : ''}>
                <button
                  type="button"
                  className="ghost-toggle"
                  onClick={() => void onToggleMealPrepared(meal.id, !meal.prepared)}
                >
                  {meal.prepared ? 'Bereit' : 'Planen'}
                </button>
                <div>
                  <strong>{meal.day}</strong>
                  <small>{meal.meal}</small>
                </div>
              </li>
            )) : null}
            {meals.length === 0 ? <li className="empty-state-text">Keine Gerichte vorhanden</li> : null}
          </ul>
        </article>
      </div>
    </section>
  );
}