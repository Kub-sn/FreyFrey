import type { PlannerState } from '../../lib/planner-data';
import { formatCalendarEntrySchedule } from '../../lib/calendar-view';

export function PlannerOverview({
  activeTab,
  openTasks,
  plannerState,
  sortedCalendarEntries,
  onToggleTask,
}: {
  activeTab: string;
  openTasks: number;
  plannerState: PlannerState;
  sortedCalendarEntries: PlannerState['calendar'];
  onToggleTask: (taskId: string, done: boolean) => Promise<void>;
}) {
  return (
    <section className={activeTab === 'overview' ? 'overview-stack is-visible' : 'overview-stack'}>
      <article className="panel overview-row-panel">
        <div className="panel-heading">
          <h3>To-dos</h3>
          <span className="chip alt">{openTasks} offen</span>
        </div>
        {plannerState.tasks.length > 0 ? (
          <ul className="task-list compact">
            {plannerState.tasks.slice(0, 5).map((task) => (
              <li key={task.id} className={task.done ? 'done' : ''}>
                <button
                  type="button"
                  className="ghost-toggle"
                  onClick={() => void onToggleTask(task.id, !task.done)}
                >
                  {task.done ? 'Erledigt' : 'Offen'}
                </button>
                <div>
                  <strong>{task.title}</strong>
                  <small>
                    {task.owner} · {task.due}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overview-empty-state">
            <strong>Keine offenen To-dos</strong>
            <small>Neue Aufgaben tauchen hier automatisch auf.</small>
          </div>
        )}
      </article>

      <article className="panel overview-row-panel">
        <div className="panel-heading">
          <h3>Kalender</h3>
          <span className="chip">{plannerState.calendar.length} Termine</span>
        </div>
        {plannerState.calendar.length > 0 ? (
          <ul className="agenda-list compact">
            {sortedCalendarEntries.slice(0, 5).map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{entry.title}</strong>
                  <small>{formatCalendarEntrySchedule(entry)}</small>
                </div>
                <span>{entry.place}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overview-empty-state">
            <strong>Keine Termine geplant</strong>
            <small>Neue Termine erscheinen hier als Nächstes.</small>
          </div>
        )}
      </article>
    </section>
  );
}