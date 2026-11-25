import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authFixture, plannerFixture } from '../components/planner/planner-test-fixtures';
import type { PlannerState } from '../lib/planner-data';
import { useCrudModules } from './useCrudModules';

const supabaseMocks = vi.hoisted(() => ({
  createShoppingList: vi.fn(),
  createShoppingListItem: vi.fn(),
  createTodoItem: vi.fn(),
  createTodoList: vi.fn(),
  createMeal: vi.fn(),
  deleteTodoItem: vi.fn(),
  deleteMeal: vi.fn(),
  deleteShoppingList: vi.fn(),
  deleteShoppingListItem: vi.fn(),
  deleteTodoList: vi.fn(),
  updateShoppingList: vi.fn(),
  updateShoppingListItemChecked: vi.fn(),
  updateTodoItemChecked: vi.fn(),
  updateTodoList: vi.fn(),
}));

vi.mock('../lib/supabase', () => supabaseMocks);

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe('useCrudModules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates shopping item state optimistically before the cloud request resolves', async () => {
    const deferred = createDeferredPromise<void>();
    const updateState = vi.fn();
    const setCloudSync = vi.fn();

    supabaseMocks.updateShoppingListItemChecked.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useCrudModules({
      authState: authFixture,
      plannerState: plannerFixture,
      setCloudSync,
      updateState,
    }));

    act(() => {
      void result.current.handleToggleShoppingListItem('shopping-list-1', 'shopping-1', true);
    });

    expect(updateState).toHaveBeenCalledTimes(1);
    const optimisticState = updateState.mock.calls[0][0](plannerFixture as PlannerState);
    expect(optimisticState.shoppingLists[0].items[0].checked).toBe(true);

    deferred.resolve();
    await Promise.resolve();
    expect(setCloudSync).not.toHaveBeenCalledWith(expect.objectContaining({ phase: 'error' }));
  });

  it('updates todo items optimistically before the cloud request resolves', async () => {
    const deferred = createDeferredPromise<void>();
    const updateState = vi.fn();
    const setCloudSync = vi.fn();

    supabaseMocks.updateTodoItemChecked.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useCrudModules({
      authState: authFixture,
      plannerState: plannerFixture,
      setCloudSync,
      updateState,
    }));

    act(() => {
      void result.current.handleToggleTodoItem('todo-list-1', 'todo-2', true);
    });

    expect(updateState).toHaveBeenCalledTimes(1);
    const optimisticState = updateState.mock.calls[0][0](plannerFixture as PlannerState);
    expect(optimisticState.todoLists[0].items[1].checked).toBe(true);

    deferred.resolve();
    await Promise.resolve();
    expect(setCloudSync).not.toHaveBeenCalledWith(expect.objectContaining({ phase: 'error' }));
  });

  it('creates an empty shopping list and returns it so the list dialog can open', async () => {
    const updateState = vi.fn();
    const setCloudSync = vi.fn();
    const createdList = { id: 'shopping-list-2', title: 'Markt', date: '2026-05-06', items: [] };

    supabaseMocks.createShoppingList.mockResolvedValueOnce(createdList);

    const { result } = renderHook(() => useCrudModules({
      authState: authFixture,
      plannerState: plannerFixture,
      setCloudSync,
      updateState,
    }));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.handleCreateShoppingList({ title: ' Markt ', date: '2026-05-06', items: [] });
    });

    expect(returned).toEqual(createdList);
    expect(supabaseMocks.createShoppingList).toHaveBeenCalledWith('family-1', {
      title: 'Markt',
      date: '2026-05-06',
      items: [],
    });
    const nextState = updateState.mock.calls[0][0](plannerFixture as PlannerState);
    expect(nextState.shoppingLists[0]).toEqual(createdList);
  });

  it('adds a shopping item via the cloud and prepends it to the list', async () => {
    const updateState = vi.fn();
    const setCloudSync = vi.fn();
    const createdItem = { id: 'shopping-2', name: 'Eier', quantity: '3', checked: false };

    supabaseMocks.createShoppingListItem.mockResolvedValueOnce(createdItem);

    const { result } = renderHook(() => useCrudModules({
      authState: authFixture,
      plannerState: plannerFixture,
      setCloudSync,
      updateState,
    }));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.handleCreateShoppingListItem('shopping-list-1', { name: '  Eier ', quantity: ' 3 ' });
    });

    expect(returned).toEqual(createdItem);
    expect(supabaseMocks.createShoppingListItem).toHaveBeenCalledWith('family-1', 'shopping-list-1', {
      name: 'Eier',
      quantity: '3',
    });
    const nextState = updateState.mock.calls[0][0](plannerFixture as PlannerState);
    expect(nextState.shoppingLists[0].items.map((item: { id: string }) => item.id)).toEqual(['shopping-2', 'shopping-1']);
  });

  it('adds a shopping item locally in demo mode and ignores empty names', async () => {
    const updateState = vi.fn();
    const setCloudSync = vi.fn();

    const { result } = renderHook(() => useCrudModules({
      authState: { ...authFixture, family: null },
      plannerState: plannerFixture,
      setCloudSync,
      updateState,
    }));

    await act(async () => {
      await expect(result.current.handleCreateShoppingListItem('shopping-list-1', { name: '   ' })).resolves.toBeNull();
    });
    expect(updateState).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleCreateShoppingListItem('shopping-list-1', { name: 'Butter' });
    });

    expect(supabaseMocks.createShoppingListItem).not.toHaveBeenCalled();
    const nextState = updateState.mock.calls[0][0](plannerFixture as PlannerState);
    expect(nextState.shoppingLists[0].items[0]).toEqual(expect.objectContaining({ name: 'Butter', checked: false }));
  });

  it('reports an error and returns null when adding a shopping item fails', async () => {
    const updateState = vi.fn();
    const setCloudSync = vi.fn();

    supabaseMocks.createShoppingListItem.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useCrudModules({
      authState: authFixture,
      plannerState: plannerFixture,
      setCloudSync,
      updateState,
    }));

    await act(async () => {
      await expect(result.current.handleCreateShoppingListItem('shopping-list-1', { name: 'Eier' })).resolves.toBeNull();
    });

    expect(updateState).not.toHaveBeenCalled();
    expect(setCloudSync).toHaveBeenCalledWith(expect.objectContaining({ phase: 'error' }));
  });

  it('removes a shopping item optimistically and restores it when the delete fails', async () => {
    const updateState = vi.fn();
    const setCloudSync = vi.fn();

    supabaseMocks.deleteShoppingListItem.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useCrudModules({
      authState: authFixture,
      plannerState: plannerFixture,
      setCloudSync,
      updateState,
    }));

    await act(async () => {
      await result.current.handleDeleteShoppingListItem('shopping-list-1', 'shopping-1');
    });

    expect(supabaseMocks.deleteShoppingListItem).toHaveBeenCalledWith('shopping-1');
    expect(updateState).toHaveBeenCalledTimes(2);
    const optimisticState = updateState.mock.calls[0][0](plannerFixture as PlannerState);
    expect(optimisticState.shoppingLists[0].items).toEqual([]);
    const restoredState = updateState.mock.calls[1][0](optimisticState);
    expect(restoredState.shoppingLists[0].items).toEqual(plannerFixture.shoppingLists[0].items);
    expect(setCloudSync).toHaveBeenCalledWith(expect.objectContaining({ phase: 'error' }));
  });

  it('updates only title and date of a shopping list and keeps items added in the meantime', async () => {
    const updateState = vi.fn();
    const setCloudSync = vi.fn();

    supabaseMocks.updateShoppingList.mockResolvedValueOnce({ id: 'shopping-list-1', title: 'Markt', date: '2026-05-07' });

    const { result } = renderHook(() => useCrudModules({
      authState: authFixture,
      plannerState: plannerFixture,
      setCloudSync,
      updateState,
    }));

    await act(async () => {
      await expect(result.current.handleUpdateShoppingList('shopping-list-1', { title: ' Markt ', date: '2026-05-07' })).resolves.toBe(true);
    });

    expect(supabaseMocks.updateShoppingList).toHaveBeenCalledWith('shopping-list-1', { title: 'Markt', date: '2026-05-07' });

    const concurrentItem = { id: 'shopping-from-other-device', name: 'Käse', checked: false };
    const stateWithConcurrentItem: PlannerState = {
      ...plannerFixture,
      shoppingLists: [{
        ...plannerFixture.shoppingLists[0],
        items: [concurrentItem, ...plannerFixture.shoppingLists[0].items],
      }],
    };
    const nextState = updateState.mock.calls[0][0](stateWithConcurrentItem);
    expect(nextState.shoppingLists[0]).toEqual({
      id: 'shopping-list-1',
      title: 'Markt',
      date: '2026-05-07',
      items: stateWithConcurrentItem.shoppingLists[0].items,
    });
  });

  it('updates only title and date of a todo list, drops a cleared date and keeps the latest items', async () => {
    const updateState = vi.fn();
    const setCloudSync = vi.fn();

    supabaseMocks.updateTodoList.mockResolvedValueOnce({ id: 'todo-list-1', title: 'Wochenende' });

    const { result } = renderHook(() => useCrudModules({
      authState: authFixture,
      plannerState: plannerFixture,
      setCloudSync,
      updateState,
    }));

    await act(async () => {
      await expect(result.current.handleUpdateTodoList('todo-list-1', { title: 'Wochenende', date: '' })).resolves.toBe(true);
    });

    expect(supabaseMocks.updateTodoList).toHaveBeenCalledWith('todo-list-1', { title: 'Wochenende' });

    const nextState = updateState.mock.calls[0][0](plannerFixture as PlannerState);
    expect(nextState.todoLists[0]).toEqual({
      id: 'todo-list-1',
      title: 'Wochenende',
      items: plannerFixture.todoLists[0].items,
    });
    expect(nextState.todoLists[0]).not.toHaveProperty('date');
  });

  it('removes a meal locally when deleting it in demo mode', async () => {
    const updateState = vi.fn();
    const setCloudSync = vi.fn();

    const localAuthState = {
      ...authFixture,
      family: null,
    };

    const { result } = renderHook(() => useCrudModules({
      authState: localAuthState,
      plannerState: plannerFixture,
      setCloudSync,
      updateState,
    }));

    await act(async () => {
      await result.current.handleDeleteMeal('meal-1');
    });

    expect(updateState).toHaveBeenCalledTimes(1);
    const nextState = updateState.mock.calls[0][0](plannerFixture as PlannerState);
    expect(nextState.meals).toEqual([]);
    expect(setCloudSync).toHaveBeenCalledWith(expect.objectContaining({ phase: 'ready' }));
  });
});