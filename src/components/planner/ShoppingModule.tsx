import type { FormEvent } from 'react';
import type { PlannerState } from '../../lib/planner-data';

export function ShoppingModule({
  activeTab,
  items,
  onAddShopping,
  onToggleShopping,
}: {
  activeTab: string;
  items: PlannerState['shoppingItems'];
  onAddShopping: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleShopping: (id: string, checked: boolean) => Promise<void>;
}) {
  return (
    <section className={activeTab === 'shopping' ? 'module is-visible' : 'module'}>
      <div className="module-layout">
        <form className="panel form-panel" onSubmit={(event) => void onAddShopping(event)}>
          <h4>Neuen Artikel hinzufügen</h4>
          <input name="name" placeholder="Artikel" />
          <input name="quantity" placeholder="Menge" />
          <input name="category" placeholder="Kategorie" />
          <button type="submit">Artikel speichern</button>
        </form>
        <article className="panel list-panel">
          <ul className="check-list">
            {items.length > 0 ? items.map((item) => (
              <li key={item.id} className={item.checked ? 'done' : ''}>
                <label>
                  <input
                    type="checkbox"
                    className="app-switch"
                    checked={item.checked}
                    onChange={() => void onToggleShopping(item.id, !item.checked)}
                  />
                  <span>{item.name}</span>
                </label>
                <small>
                  {item.quantity} · {item.category}
                </small>
              </li>
            )) : null}
            {items.length === 0 ? <li className="empty-state-text">Keine Artikel vorhanden</li> : null}
          </ul>
        </article>
      </div>
    </section>
  );
}