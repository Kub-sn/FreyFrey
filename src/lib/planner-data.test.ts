import { describe, expect, it } from 'vitest';
import { defaultPlannerState } from './planner-data';

describe('defaultPlannerState', () => {
  it('starts empty without built-in mock planner content', () => {
    expect(defaultPlannerState.members).toEqual([]);
    expect(defaultPlannerState.shoppingLists).toEqual([]);
    expect(defaultPlannerState.tasks).toEqual([]);
    expect(defaultPlannerState.notes).toEqual([]);
    expect(defaultPlannerState.meals).toEqual([]);
    expect(defaultPlannerState.documents).toEqual([]);
  });
});