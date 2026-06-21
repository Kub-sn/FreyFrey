import {
  defaultPlannerState,
  tabs,
  type PlannerState,
  type ShoppingList,
  type ShoppingListItem,
  type TabId,
  type TodoList,
  type TodoListItem,
} from './planner-data';
import { isDateKey, resolveLegacyMealDate } from './meals';

const STORAGE_KEY = 'family-planner-state-v3';
const LEGACY_STORAGE_KEYS = ['family-planner-state-v2'];
const ACTIVE_TAB_STORAGE_KEY = 'family-planner-active-tab-v1';
const UI_DRAFT_STORAGE_PREFIX = 'family-planner-ui-draft-v1:';

function isTabId(value: unknown): value is TabId {
  return typeof value === 'string' && tabs.some((tab) => tab.id === value);
}

function normalizeShoppingListItems(items: unknown): ShoppingListItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<ShoppingListItem>;
    const id = typeof candidate.id === 'string' ? candidate.id : '';
    const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
    const quantity = typeof candidate.quantity === 'string' ? candidate.quantity.trim() : '';

    if (!id || !name) {
      return [];
    }

    return [{
      id,
      name,
      quantity: quantity || undefined,
      checked: Boolean(candidate.checked),
    }];
  });
}

function normalizeShoppingLists(state: PlannerState & { shoppingItems?: unknown }): ShoppingList[] {
  if (Array.isArray(state.shoppingLists)) {
    const normalizedLists = state.shoppingLists.flatMap((list) => {
      if (!list || typeof list !== 'object') {
        return [];
      }

      const candidate = list as Partial<ShoppingList>;
      const id = typeof candidate.id === 'string' ? candidate.id : '';
      const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
      const date = typeof candidate.date === 'string' ? candidate.date : '';

      if (!id || !title || !date) {
        return [];
      }

      return [{
        id,
        title,
        date,
        items: normalizeShoppingListItems(candidate.items),
      }];
    });

    if (normalizedLists.length > 0 || !Array.isArray(state.shoppingItems) || state.shoppingItems.length === 0) {
      return normalizedLists;
    }
  }

  if (!Array.isArray(state.shoppingItems) || state.shoppingItems.length === 0) {
    return defaultPlannerState.shoppingLists;
  }

  const migratedItems = normalizeShoppingListItems(state.shoppingItems);

  if (migratedItems.length === 0) {
    return defaultPlannerState.shoppingLists;
  }

  return [{
    id: 'shopping-list-migrated',
    title: 'Vorhandene Einkaufsliste',
    date: new Date().toISOString().slice(0, 10),
    items: migratedItems,
  }];
}

function normalizeTodoListItems(items: unknown): TodoListItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<TodoListItem> & { name?: unknown; done?: unknown };
    const id = typeof candidate.id === 'string' ? candidate.id : '';
    const title = typeof candidate.title === 'string'
      ? candidate.title.trim()
      : typeof candidate.name === 'string'
        ? candidate.name.trim()
        : '';

    if (!id || !title) {
      return [];
    }

    return [{
      id,
      title,
      checked: Boolean(candidate.checked ?? candidate.done),
    }];
  });
}

function migrateLegacyTasks(tasks: unknown): TodoList[] {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return defaultPlannerState.todoLists;
  }

  const items = tasks.flatMap((task) => {
    if (!task || typeof task !== 'object') {
      return [];
    }

    const candidate = task as {
      id?: unknown;
      title?: unknown;
      status?: unknown;
      done?: unknown;
      subtasks?: unknown;
    };
    const taskId = typeof candidate.id === 'string' ? candidate.id : '';
    const taskTitle = typeof candidate.title === 'string' ? candidate.title.trim() : '';

    if (!taskId || !taskTitle) {
      return [];
    }

    const migratedItems: TodoListItem[] = [{
      id: `todo-migrated-task-${taskId}`,
      title: taskTitle,
      checked: candidate.status === 'done' || Boolean(candidate.done),
    }];

    if (Array.isArray(candidate.subtasks)) {
      candidate.subtasks.forEach((subtask) => {
        if (!subtask || typeof subtask !== 'object') {
          return;
        }

        const subtaskCandidate = subtask as { id?: unknown; title?: unknown; done?: unknown };
        const subtaskId = typeof subtaskCandidate.id === 'string' ? subtaskCandidate.id : '';
        const subtaskTitle = typeof subtaskCandidate.title === 'string' ? subtaskCandidate.title.trim() : '';

        if (!subtaskId || !subtaskTitle) {
          return;
        }

        migratedItems.push({
          id: `todo-migrated-subtask-${taskId}-${subtaskId}`,
          title: `${taskTitle} - ${subtaskTitle}`,
          checked: Boolean(subtaskCandidate.done),
        });
      });
    }

    return migratedItems;
  });

  if (items.length === 0) {
    return defaultPlannerState.todoLists;
  }

  return [{
    id: 'todo-list-migrated',
    title: 'Vorhandene To-dos',
    items,
  }];
}

function normalizeTodoLists(state: PlannerState & { todoLists?: unknown; tasks?: unknown }): TodoList[] {
  if (Array.isArray(state.todoLists)) {
    const normalizedLists = state.todoLists.flatMap((list) => {
      if (!list || typeof list !== 'object') {
        return [];
      }

      const candidate = list as Partial<TodoList>;
      const id = typeof candidate.id === 'string' ? candidate.id : '';
      const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
      const date = typeof candidate.date === 'string' && candidate.date.trim() ? candidate.date.trim() : undefined;

      if (!id || !title) {
        return [];
      }

      return [{
        id,
        title,
        ...(date ? { date } : {}),
        items: normalizeTodoListItems(candidate.items),
      }];
    });

    if (normalizedLists.length > 0 || !Array.isArray(state.tasks) || state.tasks.length === 0) {
      return normalizedLists;
    }
  }

  return migrateLegacyTasks(state.tasks);
}

function normalizeMeals(meals: unknown): PlannerState['meals'] {
  if (!Array.isArray(meals)) {
    return defaultPlannerState.meals;
  }

  return meals.flatMap((meal) => {
    if (!meal || typeof meal !== 'object') {
      return [];
    }

    const candidate = meal as Partial<PlannerState['meals'][number]> & {
      day?: string;
      meal?: string;
    };
    const id = typeof candidate.id === 'string' ? candidate.id : '';
    const date = typeof candidate.date === 'string' && isDateKey(candidate.date)
      ? candidate.date
      : typeof candidate.day === 'string'
        ? resolveLegacyMealDate(candidate.day)
        : '';
    const name = typeof candidate.name === 'string'
      ? candidate.name.trim()
      : typeof candidate.meal === 'string'
        ? candidate.meal.trim()
        : '';
    const recipe = typeof candidate.recipe === 'string' ? candidate.recipe.trim() : '';

    if (!id || !date || !name) {
      return [];
    }

    return [{
      id,
      date,
      name,
      recipe,
    }];
  });
}

function normalizePlannerState(state: PlannerState): PlannerState {
  return {
    ...state,
    shoppingLists: normalizeShoppingLists(state as PlannerState & { shoppingItems?: unknown }),
    todoLists: normalizeTodoLists(state as PlannerState & { todoLists?: unknown; tasks?: unknown }),
    meals: normalizeMeals(state.meals),
    notes: Array.isArray(state.notes)
      ? state.notes.map((note) => ({
          id: note.id,
          title: note.title,
          text: note.text,
        }))
      : defaultPlannerState.notes,
  };
}

export function loadPlannerState(): PlannerState {
  if (typeof window === 'undefined') {
    return defaultPlannerState;
  }

  const rawState = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]
    .map((key) => window.localStorage.getItem(key))
    .find((value) => Boolean(value));

  if (!rawState) {
    return defaultPlannerState;
  }

  try {
    return normalizePlannerState(JSON.parse(rawState) as PlannerState);
  } catch {
    return defaultPlannerState;
  }
}

export function savePlannerState(state: PlannerState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadActiveTab(): TabId | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawTab = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);

  if (!rawTab) {
    return null;
  }

  return isTabId(rawTab) ? rawTab : null;
}

export function saveActiveTab(tab: TabId) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
}

export function loadUiDraft<T>(key: string, fallbackValue: T): T {
  if (typeof window === 'undefined') {
    return fallbackValue;
  }

  const rawValue = window.localStorage.getItem(`${UI_DRAFT_STORAGE_PREFIX}${key}`);

  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallbackValue;
  }
}

export function saveUiDraft<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(`${UI_DRAFT_STORAGE_PREFIX}${key}`, JSON.stringify(value));
}

export function clearUiDraft(key: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(`${UI_DRAFT_STORAGE_PREFIX}${key}`);
}