import type { PlannerState } from '../../lib/planner-data';
import { useActiveTab } from '../../context/ActiveTabContext';
import { formatTodoListDate } from '../../lib/tasks';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';

export function PlannerOverview({
  openTasks,
  plannerState,
  onToggleTodoItem,
}: {
  openTasks: number;
  plannerState: PlannerState;
  onToggleTodoItem: (listId: string, itemId: string, checked: boolean) => Promise<void>;
}) {
  const { activeTab } = useActiveTab();
  const visibleTodos = plannerState.todoLists
    .flatMap((list) => list.items
      .filter((item) => !item.checked)
      .map((item) => ({ item, list })))
    .slice(0, 6);

  return (
    <section className={activeTab === 'overview' ? 'overview-stack is-visible' : 'overview-stack'}>
      <AppCard className="overview-row-panel">
        <div className="panel-heading">
          <h3>To-dos</h3>
          <span className="chip alt">{openTasks} offen</span>
        </div>
        <div className="min-h-0 overflow-y-auto overflow-x-hidden">
          {visibleTodos.length > 0 ? (
            <ul className="task-list [&>li]:py-[0.7rem]">
              {visibleTodos.map(({ item, list }) => (
                <li key={`${list.id}-${item.id}`}>
                  <AppButton
                    type="button"
                    variant="ghost"
                    onClick={() => void onToggleTodoItem(list.id, item.id, true)}
                  >
                    Erledigen
                  </AppButton>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{list.date ? `${list.title} · ${formatTodoListDate(list.date)}` : list.title}</small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overview-empty-state grid gap-[0.3rem] py-[0.35rem]">
              <strong>Keine offenen To-dos</strong>
              <small>Neue To-dos tauchen hier automatisch auf.</small>
            </div>
          )}
        </div>
      </AppCard>
    </section>
  );
}
