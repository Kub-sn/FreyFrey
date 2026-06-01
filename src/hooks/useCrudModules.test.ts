import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { authFixture, plannerFixture } from '../components/planner/planner-test-fixtures';
import type { PlannerState } from '../lib/planner-data';
import { useCrudModules } from './useCrudModules';

const supabaseMocks = vi.hoisted(() => ({
  createShoppingList: vi.fn(),
  createTask: vi.fn(),
  createMeal: vi.fn(),
  deleteShoppingList: vi.fn(),
  deleteTask: vi.fn(),
  updateShoppingList: vi.fn(),
  updateShoppingListItemChecked: vi.fn(),
  updateTask: vi.fn(),
  updateMealPrepared: vi.fn(),
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

  it('updates task subtasks optimistically before the cloud request resolves', async () => {
    const deferred = createDeferredPromise<void>();
    const updateState = vi.fn();
    const setCloudSync = vi.fn();

    supabaseMocks.updateTask.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useCrudModules({
      authState: authFixture,
      plannerState: plannerFixture,
      setCloudSync,
      updateState,
    }));

    act(() => {
      void result.current.handleToggleTaskSubtask('task-1', 'task-1-subtask-2', true);
    });

    expect(updateState).toHaveBeenCalledTimes(1);
    const optimisticState = updateState.mock.calls[0][0](plannerFixture as PlannerState);
    expect(optimisticState.tasks[0].subtasks[1].done).toBe(true);

    deferred.resolve();
    await Promise.resolve();
    expect(setCloudSync).not.toHaveBeenCalledWith(expect.objectContaining({ phase: 'error' }));
  });
});