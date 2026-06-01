import { afterEach, describe, expect, it } from 'vitest';
import { defaultPlannerState } from './planner-data';
import { loadActiveTab, loadPlannerState, saveActiveTab } from './storage';

describe('loadPlannerState', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('strips legacy note categories from stored planner state', () => {
    window.localStorage.setItem(
      'family-planner-state-v2',
      JSON.stringify({
        ...defaultPlannerState,
        notes: [
          {
            id: 'note-1',
            title: 'Hinweis',
            text: 'Brotdose einpacken',
            tag: 'Schule',
          },
        ],
      }),
    );

    expect(loadPlannerState().notes).toEqual([
      {
        id: 'note-1',
        title: 'Hinweis',
        text: 'Brotdose einpacken',
      },
    ]);
  });

  it('migrates legacy flat shopping items into a shopping list', () => {
    window.localStorage.setItem(
      'family-planner-state-v2',
      JSON.stringify({
        ...defaultPlannerState,
        shoppingItems: [
          {
            id: 'shopping-1',
            name: 'Milch',
            quantity: '2',
            checked: false,
          },
        ],
      }),
    );

    expect(loadPlannerState().shoppingLists).toEqual([
      {
        id: 'shopping-list-migrated',
        title: 'Vorhandene Einkaufsliste',
        date: expect.any(String),
        items: [
          {
            id: 'shopping-1',
            name: 'Milch',
            quantity: '2',
            checked: false,
          },
        ],
      },
    ]);
  });

  it('migrates legacy tasks with only a done flag to the new task shape', () => {
    window.localStorage.setItem(
      'family-planner-state-v2',
      JSON.stringify({
        ...defaultPlannerState,
        tasks: [
          {
            id: 'task-1',
            title: 'Sportsachen packen',
            owner: 'Alex',
            due: '2026-05-02',
            done: true,
          },
          {
            id: 'task-2',
            title: 'Fragebogen ausfuellen',
            owner: 'Bea',
            due: '2026-05-03',
            done: false,
            subtasks: [
              { id: 'subtask-1', title: 'Unterschrift holen', done: true },
              { id: 'subtask-2', title: '  ', done: false },
            ],
          },
        ],
      }),
    );

    expect(loadPlannerState().tasks).toEqual([
      {
        id: 'task-1',
        title: 'Sportsachen packen',
        owner: 'Alex',
        due: '2026-05-02',
        status: 'done',
        subtasks: [],
      },
      {
        id: 'task-2',
        title: 'Fragebogen ausfuellen',
        owner: 'Bea',
        due: '2026-05-03',
        status: 'todo',
        subtasks: [{ id: 'subtask-1', title: 'Unterschrift holen', done: true }],
      },
    ]);
  });

  it('keeps shopping items without a quantity when loading planner state', () => {
    window.localStorage.setItem(
      'family-planner-state-v3',
      JSON.stringify({
        ...defaultPlannerState,
        shoppingLists: [
          {
            id: 'shopping-list-1',
            title: 'Kurzliste',
            date: '2026-05-09',
            items: [
              {
                id: 'shopping-1',
                name: 'Wasser',
                checked: false,
              },
            ],
          },
        ],
      }),
    );

    expect(loadPlannerState().shoppingLists).toEqual([
      {
        id: 'shopping-list-1',
        title: 'Kurzliste',
        date: '2026-05-09',
        items: [
          {
            id: 'shopping-1',
            name: 'Wasser',
            quantity: undefined,
            checked: false,
          },
        ],
      },
    ]);
  });

  it('prefers the current storage key when both current and legacy state exist', () => {
    window.localStorage.setItem(
      'family-planner-state-v2',
      JSON.stringify({
        ...defaultPlannerState,
        notes: [
          {
            id: 'legacy-note',
            title: 'Legacy',
            text: 'Aus altem Speicher',
          },
        ],
      }),
    );

    window.localStorage.setItem(
      'family-planner-state-v3',
      JSON.stringify({
        ...defaultPlannerState,
        notes: [
          {
            id: 'current-note',
            title: 'Current',
            text: 'Aus aktuellem Speicher',
          },
        ],
      }),
    );

    expect(loadPlannerState().notes).toEqual([
      {
        id: 'current-note',
        title: 'Current',
        text: 'Aus aktuellem Speicher',
      },
    ]);
  });

  it('loads and saves the active tab when it is valid', () => {
    saveActiveTab('family');

    expect(loadActiveTab()).toBe('family');
  });

  it('ignores invalid stored active tabs', () => {
    window.localStorage.setItem('family-planner-active-tab-v1', 'not-a-real-tab');

    expect(loadActiveTab()).toBeNull();
  });
});