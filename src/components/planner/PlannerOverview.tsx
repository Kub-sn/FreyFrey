import type { PlannerState } from '../../lib/planner-data';
import { formatCalendarEntrySchedule } from '../../lib/calendar-view';
import { useActiveTab } from '../../context/ActiveTabContext';
import { formatTaskDueLabel, isTaskDone } from '../../lib/tasks';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';

export function PlannerOverview({
  openTasks,
  plannerState,
  sortedCalendarEntries,
  onToggleTask,
}: {
  openTasks: number;
  plannerState: PlannerState;
  sortedCalendarEntries: PlannerState['calendar'];
  onToggleTask: (taskId: string, done: boolean) => Promise<void>;
}) {
  const { activeTab } = useActiveTab();
  const visibleTasks = plannerState.tasks.filter((task) => !isTaskDone(task)).slice(0, 6);

  return (
    <section className={activeTab === 'overview' ? 'overview-stack is-visible' : 'overview-stack'}>
      <AppCard className="overview-row-panel">
        <div className="panel-heading">
          <h3>To-dos</h3>
          <span className="chip alt">{openTasks} offen</span>
        </div>
        <div className="min-h-0 overflow-y-auto overflow-x-hidden">
          {visibleTasks.length > 0 ? (
            <ul className="task-list [&>li]:py-[0.7rem]">
              {visibleTasks.map((task) => (
                <li key={task.id}>
                  <AppButton
                    type="button"
                    variant="ghost"
                    onClick={() => void onToggleTask(task.id, true)}
                  >
                    Erledigen
                  </AppButton>
                  <div>
                    <strong>{task.title}</strong>
                    <small>
                      {task.owner} · {formatTaskDueLabel(task.due)}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overview-empty-state grid gap-[0.3rem] py-[0.35rem]">
              <strong>Keine offenen To-dos</strong>
              <small>Neue Aufgaben tauchen hier automatisch auf.</small>
            </div>
          )}
        </div>
      </AppCard>

      <AppCard className="overview-row-panel">
        <div className="panel-heading">
          <h3>Kalender</h3>
          <span className="chip">{plannerState.calendar.length} Termine</span>
        </div>
        <div className="min-h-0 overflow-y-auto overflow-x-hidden">
          {plannerState.calendar.length > 0 ? (
            <ul className="agenda-list [&>li]:py-[0.7rem]">
              {sortedCalendarEntries.map((entry) => (
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
            <div className="overview-empty-state grid gap-[0.3rem] py-[0.35rem]">
              <strong>Keine Termine geplant</strong>
              <small>Neue Termine erscheinen hier als Nächstes.</small>
            </div>
          )}
        </div>
      </AppCard>
    </section>
  );
}
