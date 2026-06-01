import type {
  MealItem,
  PlannerState,
  ShoppingList,
  ShoppingListItem,
  TaskItem,
  TaskStatus,
} from '../lib/planner-data';
import type { AuthState, CloudSyncSetterValue } from '../app/types';
import {
  createShoppingList,
  createTask,
  createMeal,
  deleteMeal,
  deleteShoppingList,
  deleteTask,
  updateShoppingList,
  updateShoppingListItemChecked,
  updateTask,
} from '../lib/supabase';
import { humanizeAuthError } from '../lib/auth-errors';
import { nextStringId } from '../lib/id';

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
    shoppingLists: state.shoppingLists.map((entry) =>
      entry.id === listId
        ? {
            ...entry,
            items: entry.items.map((item) =>
              item.id === itemId ? { ...item, checked } : item,
            ),
          }
        : entry,
    ),
  });

  const applyTaskSubtaskDone = (state: PlannerState, taskId: string, subtaskId: string, done: boolean, status: TaskStatus) => ({
    ...state,
    tasks: state.tasks.map((entry) =>
      entry.id === taskId
        ? {
            ...entry,
            status,
            subtasks: entry.subtasks.map((subtask) =>
              subtask.id === subtaskId ? { ...subtask, done } : subtask,
            ),
          }
        : entry,
    ),
  });

  const normalizeShoppingItems = (items: ShoppingListItem[]) =>
    items
      .flatMap((item) => {
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

  const handleCreateShoppingList = async (payload: Omit<ShoppingList, 'id'>) => {
    const normalizedItems = normalizeShoppingItems(payload.items);

    if (!payload.title.trim() || !payload.date || normalizedItems.length === 0) {
      return false;
    }

    try {
      if (authState.family) {
        const createdList = await createShoppingList(authState.family.familyId, {
          title: payload.title.trim(),
          date: payload.date,
          items: normalizedItems,
        });
        updateState((current) => ({
          ...current,
          shoppingLists: [createdList, ...current.shoppingLists],
        }));
        setCloudSync({
          phase: 'ready',
          message: 'Neue Einkaufsliste wurde gespeichert.',
        });
      } else {
        updateState((current) => ({
          ...current,
          shoppingLists: [
            {
              id: nextStringId(),
              title: payload.title.trim(),
              date: payload.date,
              items: normalizedItems,
            },
            ...current.shoppingLists,
          ],
        }));
      }

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
    const normalizedItems = normalizeShoppingItems(payload.items);

    if (!payload.title.trim() || !payload.date || normalizedItems.length === 0) {
      return false;
    }

    try {
      if (authState.family) {
        const savedList = await updateShoppingList(authState.family.familyId, id, {
          title: payload.title.trim(),
          date: payload.date,
          items: normalizedItems,
        });

        updateState((current) => ({
          ...current,
          shoppingLists: current.shoppingLists.map((entry) =>
            entry.id === id ? savedList : entry,
          ),
        }));
      } else {
        updateState((current) => ({
          ...current,
          shoppingLists: current.shoppingLists.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  title: payload.title.trim(),
                  date: payload.date,
                  items: normalizedItems,
                }
              : entry,
          ),
        }));
      }

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

  const handleAddTask = async (payload: Omit<TaskItem, 'id' | 'status'>) => {
    if (!payload.title || !payload.owner || !payload.due) {
      return false;
    }

    try {
      if (authState.family) {
        const createdTask = await createTask(authState.family.familyId, {
          title: payload.title,
          owner: payload.owner,
          due: payload.due,
          status: 'todo',
          subtasks: payload.subtasks,
        });
        updateState((current) => ({
          ...current,
          tasks: [createdTask, ...current.tasks],
        }));
        setCloudSync({
          phase: 'ready',
          message: 'Neue Aufgabe wurde gespeichert.',
        });
      } else {
        updateState((current) => ({
          ...current,
          tasks: [{ id: nextStringId(), title: payload.title, owner: payload.owner, due: payload.due, status: 'todo', subtasks: payload.subtasks }, ...current.tasks],
        }));
      }
      return true;
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
      return false;
    }
  };

  const handleUpdateTask = async (id: string, payload: Partial<Omit<TaskItem, 'id'>>) => {
    const currentTask = plannerState.tasks.find((entry) => entry.id === id) ?? null;

    if (!currentTask) {
      return false;
    }

    try {
      if (authState.family) {
        await updateTask(id, payload);
      }
      updateState((current) => ({
        ...current,
        tasks: current.tasks.map((entry) => (
          entry.id === id ? { ...entry, ...payload } : entry
        )),
      }));
      return true;
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
      return false;
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      if (authState.family) {
        await deleteTask(id);
      }
      updateState((current) => ({
        ...current,
        tasks: current.tasks.filter((entry) => entry.id !== id),
      }));
      return true;
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
      return false;
    }
  };

  const handleSetTaskStatus = async (id: string, status: TaskStatus) => {
    const currentTask = plannerState.tasks.find((entry) => entry.id === id) ?? null;

    if (!currentTask) {
      return;
    }

    const nextSubtasks = status === 'done'
      ? currentTask.subtasks.map((subtask) => ({ ...subtask, done: true }))
      : currentTask.subtasks;

    try {
      if (authState.family) {
        await updateTask(id, { status, subtasks: nextSubtasks });
      }
      updateState((current) => ({
        ...current,
        tasks: current.tasks.map((entry) =>
          entry.id === id
            ? { ...entry, status, subtasks: nextSubtasks }
            : entry,
        ),
      }));
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleToggleTask = async (id: string, done: boolean) => {
    await handleSetTaskStatus(id, done ? 'done' : 'todo');
  };

  const handleToggleTaskSubtask = async (taskId: string, subtaskId: string, done: boolean) => {
    const currentTask = plannerState.tasks.find((entry) => entry.id === taskId) ?? null;

    if (!currentTask) {
      return;
    }

    const nextSubtasks = currentTask.subtasks.map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, done } : subtask,
    );
    const nextStatus = currentTask.status === 'done' && !done ? 'in-progress' : currentTask.status;

    updateState((current) => applyTaskSubtaskDone(current, taskId, subtaskId, done, nextStatus));

    try {
      if (authState.family) {
        await updateTask(taskId, { subtasks: nextSubtasks, status: nextStatus });
      }
    } catch (error) {
      updateState((current) => applyTaskSubtaskDone(current, taskId, subtaskId, !done, currentTask.status));
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
      if (authState.family) {
        const createdMeal = await createMeal(authState.family.familyId, {
          date,
          name,
          recipe,
        });
        updateState((current) => ({
          ...current,
          meals: [...current.meals, createdMeal],
        }));
        setCloudSync({
          phase: 'ready',
          message: 'Gericht wurde gespeichert.',
        });
      } else {
        updateState((current) => ({
          ...current,
          meals: [...current.meals, { id: nextStringId(), date, name, recipe }],
        }));
      }

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
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    handleToggleTask,
    handleSetTaskStatus,
    handleToggleTaskSubtask,
    handleCreateMeal,
    handleDeleteMeal,
  };
}
