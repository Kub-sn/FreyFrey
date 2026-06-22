import type { AuthState, CloudSyncSetterValue } from '../app/types';
import { humanizeAuthError } from '../lib/auth-errors';
import { nextStringId } from '../lib/id';
import type {
  MealItem,
  PlannerState,
  ShoppingList,
  ShoppingListItem,
  TodoList,
  TodoListItem,
} from '../lib/planner-data';
import {
  createMeal,
  createShoppingList,
  createTodoItem,
  createTodoList,
  deleteMeal,
  deleteShoppingList,
  deleteTodoItem,
  deleteTodoList,
  updateShoppingList,
  updateShoppingListItemChecked,
  updateTodoItemChecked,
  updateTodoList,
} from '../lib/supabase';

type UseCrudModulesParams = {
  authState: AuthState;
  plannerState: PlannerState;
  setCloudSync: (value: CloudSyncSetterValue) => void;
  updateState: (updater: (current: PlannerState) => PlannerState) => void;
};

export function useCrudModules({
  authState,
  plannerState,
  setCloudSync,
  updateState,
}: UseCrudModulesParams) {
  const applyShoppingItemChecked = (state: PlannerState, listId: string, itemId: string, checked: boolean) => ({
    ...state,
    shoppingLists: state.shoppingLists.map((entry) => (
      entry.id === listId
        ? {
            ...entry,
            items: entry.items.map((item) => (
              item.id === itemId ? { ...item, checked } : item
            )),
          }
        : entry
    )),
  });

  const applyTodoItemChecked = (state: PlannerState, listId: string, itemId: string, checked: boolean) => ({
    ...state,
    todoLists: state.todoLists.map((entry) => (
      entry.id === listId
        ? {
            ...entry,
            items: entry.items.map((item) => (
              item.id === itemId ? { ...item, checked } : item
            )),
          }
        : entry
    )),
  });

  const normalizeShoppingItems = (items: ShoppingListItem[]) =>
    items.flatMap((item) => {
      const name = item.name.trim();
      const quantity = item.quantity?.trim();

      if (!name) {
        return [];
      }

      return [{
        ...item,
        id: item.id || nextStringId(),
        name,
        quantity: quantity || undefined,
      }];
    });

  const normalizeTodoItems = (items: TodoListItem[]) =>
    items.flatMap((item) => {
      const title = item.title.trim().replace(/\s+/g, ' ');

      if (!title) {
        return [];
      }

      return [{
        ...item,
        id: item.id || nextStringId(),
        title,
      }];
    });

  const normalizeTodoListPayload = (payload: Omit<TodoList, 'id'>): Omit<TodoList, 'id'> => ({
    title: payload.title.trim(),
    ...(payload.date?.trim() ? { date: payload.date.trim() } : {}),
    items: normalizeTodoItems(payload.items),
  });

  const handleCreateShoppingList = async (payload: Omit<ShoppingList, 'id'>) => {
    const title = payload.title.trim();
    const normalizedItems = normalizeShoppingItems(payload.items);

    if (!title || !payload.date || normalizedItems.length === 0) {
      return false;
    }

    try {
      const createdList = authState.family
        ? await createShoppingList(authState.family.familyId, {
            title,
            date: payload.date,
            items: normalizedItems,
          })
        : {
            id: nextStringId(),
            title,
            date: payload.date,
            items: normalizedItems,
          };

      updateState((current) => ({
        ...current,
        shoppingLists: [createdList, ...current.shoppingLists],
      }));
      setCloudSync({
        phase: 'ready',
        message: 'Neue Einkaufsliste wurde gespeichert.',
      });

      return true;
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
      return false;
    }
  };

  const handleUpdateShoppingList = async (id: string, payload: Omit<ShoppingList, 'id'>) => {
    const title = payload.title.trim();
    const normalizedItems = normalizeShoppingItems(payload.items);

    if (!title || !payload.date || normalizedItems.length === 0) {
      return false;
    }

    try {
      const savedList = authState.family
        ? await updateShoppingList(authState.family.familyId, id, {
            title,
            date: payload.date,
            items: normalizedItems,
          })
        : {
            id,
            title,
            date: payload.date,
            items: normalizedItems,
          };

      updateState((current) => ({
        ...current,
        shoppingLists: current.shoppingLists.map((entry) => (
          entry.id === id ? savedList : entry
        )),
      }));
      setCloudSync({
        phase: 'ready',
        message: 'Einkaufsliste wurde aktualisiert.',
      });

      return true;
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
      return false;
    }
  };

  const handleDeleteShoppingList = async (id: string) => {
    try {
      if (authState.family) {
        await deleteShoppingList(id);
      }

      updateState((current) => ({
        ...current,
        shoppingLists: current.shoppingLists.filter((entry) => entry.id !== id),
      }));
      setCloudSync({
        phase: 'ready',
        message: 'Einkaufsliste wurde gelöscht.',
      });

      return true;
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
      return false;
    }
  };

  const handleToggleShoppingListItem = async (listId: string, itemId: string, checked: boolean) => {
    updateState((current) => applyShoppingItemChecked(current, listId, itemId, checked));

    try {
      if (authState.family) {
        await updateShoppingListItemChecked(itemId, checked);
      }
    } catch (error) {
      updateState((current) => applyShoppingItemChecked(current, listId, itemId, !checked));
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleCreateTodoList = async (payload: Omit<TodoList, 'id'>): Promise<TodoList | null> => {
    const normalizedPayload = normalizeTodoListPayload(payload);

    if (!normalizedPayload.title) {
      return null;
    }

    try {
      const createdList = authState.family
        ? await createTodoList(authState.family.familyId, normalizedPayload)
        : {
            id: nextStringId(),
            ...normalizedPayload,
          };

      updateState((current) => ({
        ...current,
        todoLists: [createdList, ...current.todoLists],
      }));
      setCloudSync({
        phase: 'ready',
        message: 'Neue Todo-Liste wurde gespeichert.',
      });

      return createdList;
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
      return null;
    }
  };

  const handleUpdateTodoList = async (id: string, payload: Omit<TodoList, 'id'>) => {
    const currentList = plannerState.todoLists.find((entry) => entry.id === id) ?? null;
    const normalizedPayload = normalizeTodoListPayload(payload);

    if (!currentList || !normalizedPayload.title) {
      return false;
    }

    try {
      const savedList = authState.family
        ? await updateTodoList(authState.family.familyId, id, normalizedPayload)
        : {
            id,
            ...normalizedPayload,
          };

      updateState((current) => ({
        ...current,
        todoLists: current.todoLists.map((entry) => (
          entry.id === id ? savedList : entry
        )),
      }));
      setCloudSync({
        phase: 'ready',
        message: 'Todo-Liste wurde aktualisiert.',
      });

      return true;
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
      return false;
    }
  };

  const handleDeleteTodoList = async (id: string) => {
    try {
      if (authState.family) {
        await deleteTodoList(id);
      }

      updateState((current) => ({
        ...current,
        todoLists: current.todoLists.filter((entry) => entry.id !== id),
      }));
      setCloudSync({
        phase: 'ready',
        message: 'Todo-Liste wurde gelöscht.',
      });

      return true;
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
      return false;
    }
  };

  const handleCreateTodoItem = async (listId: string, title: string): Promise<TodoListItem | null> => {
    const currentList = plannerState.todoLists.find((entry) => entry.id === listId) ?? null;
    const normalizedTitle = title.trim().replace(/\s+/g, ' ');

    if (!currentList || !normalizedTitle) {
      return null;
    }

    try {
      const createdItem = authState.family
        ? await createTodoItem(authState.family.familyId, listId, normalizedTitle)
        : {
            id: nextStringId(),
            title: normalizedTitle,
            checked: false,
          };

      updateState((current) => ({
        ...current,
        todoLists: current.todoLists.map((entry) => (
          entry.id === listId
            ? { ...entry, items: [createdItem, ...entry.items] }
            : entry
        )),
      }));

      return createdItem;
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
      return null;
    }
  };

  const handleToggleTodoItem = async (listId: string, itemId: string, checked: boolean) => {
    updateState((current) => applyTodoItemChecked(current, listId, itemId, checked));

    try {
      if (authState.family) {
        await updateTodoItemChecked(itemId, checked);
      }
    } catch (error) {
      updateState((current) => applyTodoItemChecked(current, listId, itemId, !checked));
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleDeleteTodoItem = async (listId: string, itemId: string) => {
    const currentList = plannerState.todoLists.find((entry) => entry.id === listId) ?? null;

    if (!currentList) {
      return;
    }

    updateState((current) => ({
      ...current,
      todoLists: current.todoLists.map((entry) => (
        entry.id === listId
          ? { ...entry, items: entry.items.filter((item) => item.id !== itemId) }
          : entry
      )),
    }));

    try {
      if (authState.family) {
        await deleteTodoItem(itemId);
      }
    } catch (error) {
      updateState((current) => ({
        ...current,
        todoLists: current.todoLists.map((entry) => (
          entry.id === listId ? currentList : entry
        )),
      }));
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleCreateMeal = async (payload: Omit<MealItem, 'id'>) => {
    const date = payload.date.trim();
    const name = payload.name.trim();
    const recipe = payload.recipe.trim();

    if (!date || !name) {
      return false;
    }

    try {
      const createdMeal = authState.family
        ? await createMeal(authState.family.familyId, { date, name, recipe })
        : { id: nextStringId(), date, name, recipe };

      updateState((current) => ({
        ...current,
        meals: [...current.meals, createdMeal],
      }));
      setCloudSync({
        phase: 'ready',
        message: 'Gericht wurde gespeichert.',
      });

      return true;
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });

      return false;
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      if (authState.family) {
        await deleteMeal(mealId);
      }

      updateState((current) => ({
        ...current,
        meals: current.meals.filter((meal) => meal.id !== mealId),
      }));
      setCloudSync({
        phase: 'ready',
        message: 'Gericht wurde gelöscht.',
      });

      return true;
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });

      return false;
    }
  };

  return {
    handleCreateShoppingList,
    handleUpdateShoppingList,
    handleDeleteShoppingList,
    handleToggleShoppingListItem,
    handleCreateTodoList,
    handleUpdateTodoList,
    handleDeleteTodoList,
    handleCreateTodoItem,
    handleToggleTodoItem,
    handleDeleteTodoItem,
    handleCreateMeal,
    handleDeleteMeal,
  };
}
