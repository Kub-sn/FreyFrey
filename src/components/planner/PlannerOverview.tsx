import type { ReactNode } from 'react';
import type { PlannerState, ShoppingList, TodoList } from '../../lib/planner-data';
import { useActiveTab } from '../../context/ActiveTabContext';
import { cn } from '../../lib/classnames';
import { formatTodoListDate } from '../../lib/tasks';
import { appCheckboxClassName } from '../ui/AppField';
import { AppCard } from '../ui/AppCard';

function OverviewListCard({
  title,
  count,
  emptyTitle,
  emptyHint,
  hasContent,
  children,
}: {
  title: string;
  count: number;
  emptyTitle: string;
  emptyHint: string;
  hasContent: boolean;
  children: ReactNode;
}) {
  return (
    <AppCard className="overview-row-panel">
      <div className="panel-heading">
        <h3>{title}</h3>
        <span className="chip alt">{count} offen</span>
      </div>
      <div className="min-h-0 overflow-y-auto overflow-x-hidden">
        {hasContent ? (
          <div className="grid gap-4 max-mobile:gap-3">{children}</div>
        ) : (
          <div className="overview-empty-state grid gap-[0.3rem] py-[0.35rem]">
            <strong>{emptyTitle}</strong>
            <small>{emptyHint}</small>
          </div>
        )}
      </div>
    </AppCard>
  );
}

function OverviewListGroup({
  name,
  meta,
  isLast,
  children,
}: {
  name: string;
  meta?: string;
  isLast: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'grid gap-2',
        !isLast && 'border-b border-[rgba(24,52,47,0.1)] pb-4 max-mobile:pb-3',
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h4 className="m-0 text-[0.95rem] font-semibold text-[#18342f]">{name}</h4>
        {meta ? (
          <span className="text-[0.78rem] text-[rgba(24,52,47,0.55)]">{meta}</span>
        ) : null}
      </div>
      <ul className="check-list [&>li]:py-[0.55rem]">{children}</ul>
    </section>
  );
}

export function PlannerOverview({
  openTasks,
  pendingShopping,
  plannerState,
  onToggleTodoItem,
  onToggleShoppingItem,
}: {
  openTasks: number;
  pendingShopping: number;
  plannerState: PlannerState;
  onToggleTodoItem: (listId: string, itemId: string, checked: boolean) => Promise<void>;
  onToggleShoppingItem: (listId: string, itemId: string, checked: boolean) => Promise<void>;
}) {
  const { activeTab } = useActiveTab();

  const todoLists = plannerState.todoLists.filter((list) => list.items.length > 0);
  const shoppingLists = plannerState.shoppingLists.filter((list) => list.items.length > 0);

  return (
    <section className={activeTab === 'overview' ? 'overview-stack is-visible' : 'overview-stack'}>
      <OverviewListCard
        title="To-dos"
        count={openTasks}
        emptyTitle="Keine To-dos"
        emptyHint="Neue To-dos tauchen hier automatisch auf."
        hasContent={todoLists.length > 0}
      >
        {todoLists.map((list: TodoList, listIndex) => (
          <OverviewListGroup
            key={list.id}
            name={list.title}
            meta={list.date ? formatTodoListDate(list.date) : undefined}
            isLast={listIndex === todoLists.length - 1}
          >
            {list.items.map((item) => (
              <li
                key={item.id}
                className={cn(item.checked && '[&_.todo-item-copy]:opacity-60 [&_.todo-item-copy]:line-through')}
              >
                <label className="min-w-0 flex-1">
                  <input
                    type="checkbox"
                    className={appCheckboxClassName()}
                    checked={item.checked}
                    onChange={() => void onToggleTodoItem(list.id, item.id, !item.checked)}
                  />
                  <span className="todo-item-copy">{item.title}</span>
                </label>
              </li>
            ))}
          </OverviewListGroup>
        ))}
      </OverviewListCard>

      <OverviewListCard
        title="Einkäufe"
        count={pendingShopping}
        emptyTitle="Keine Einkäufe"
        emptyHint="Neue Einkäufe tauchen hier automatisch auf."
        hasContent={shoppingLists.length > 0}
      >
        {shoppingLists.map((list: ShoppingList, listIndex) => (
          <OverviewListGroup
            key={list.id}
            name={list.title}
            isLast={listIndex === shoppingLists.length - 1}
          >
            {list.items.map((item) => (
              <li
                key={item.id}
                className={cn(item.checked && '[&_.shopping-item-copy]:opacity-60 [&_.shopping-item-copy]:line-through')}
              >
                <label className="min-w-0 flex-1">
                  <input
                    type="checkbox"
                    className={appCheckboxClassName()}
                    checked={item.checked}
                    onChange={() => void onToggleShoppingItem(list.id, item.id, !item.checked)}
                  />
                  <span className="shopping-item-copy inline-flex items-center gap-2">
                    {item.quantity ? <span>{item.quantity}</span> : null}
                    <span>{item.name}</span>
                  </span>
                </label>
              </li>
            ))}
          </OverviewListGroup>
        ))}
      </OverviewListCard>
    </section>
  );
}
