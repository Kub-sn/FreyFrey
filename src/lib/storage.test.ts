import { afterEach, describe, expect, it } from 'vitest';
import { defaultPlannerState } from './planner-data';
import { loadPlannerState } from './storage';

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
});