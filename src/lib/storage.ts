import {
  defaultPlannerState,
  tabs,
  type PlannerState,
  type ShoppingList,
  type ShoppingListItem,
  type TabId,
  type TaskStatus,
} from './planner-data';

const STORAGE_KEY = 'family-planner-state-v3';
const LEGACY_STORAGE_KEYS = ['family-planner-state-v2'];
const ACTIVE_TAB_STORAGE_KEY = 'family-planner-active-tab-v1';

function isTabId(value: unknown): value is TabId {
  return typeof value === 'string' && tabs.some((tab) => tab.id === value);
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === 'todo' || value === 'in-progress' || value === 'done';
}

function normalizeTaskSubtasks(subtasks: unknown): PlannerState['tasks'][number]['subtasks'] {
  if (!Array.isArray(subtasks)) {
    return [];
  }

  return subtasks.flatMap((subtask) => {
    if (!subtask || typeof subtask !== 'object') {
      return [];
    }

    const candidate = subtask as Partial<PlannerState['tasks'][number]['subtasks'][number]>;
    const id = typeof candidate.id === 'string' ? candidate.id : '';
    const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';

    if (!id || !title) {
      return [];
    }

    return [{
      id,
      title,
      done: Boolean(candidate.done),
    }];
  });
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

    if (!id || !name || !quantity) {
      return [];
    }

    return [{
      id,
      name,
      quantity,
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

function normalizeTasks(tasks: unknown): PlannerState['tasks'] {
  if (!Array.isArray(tasks)) {
    return defaultPlannerState.tasks;
  }

  return tasks.flatMap((task) => {
    if (!task || typeof task !== 'object') {
      return [];
    }

    const candidate = task as Partial<PlannerState['tasks'][number]> & { done?: boolean };
    const id = typeof candidate.id === 'string' ? candidate.id : '';
    const title = typeof candidate.title === 'string' ? candidate.title : '';
    const owner = typeof candidate.owner === 'string' ? candidate.owner : '';
    const due = typeof candidate.due === 'string' ? candidate.due : '';
    const status = isTaskStatus(candidate.status)
      ? candidate.status
      : candidate.done
        ? 'done'
        : 'todo';

    if (!id || !title || !owner || !due) {
      return [];
    }

    return [{
      id,
      title,
      owner,
      due,
      status,
      subtasks: normalizeTaskSubtasks(candidate.subtasks),
    }];
  });
}

function normalizePlannerState(state: PlannerState): PlannerState {
  return {
    ...state,
    shoppingLists: normalizeShoppingLists(state as PlannerState & { shoppingItems?: unknown }),
    tasks: normalizeTasks(state.tasks),
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