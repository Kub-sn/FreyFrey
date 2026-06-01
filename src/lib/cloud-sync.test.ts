import { describe, expect, it } from 'vitest';
import { applyCloudCollections } from './cloud-sync';
import { defaultPlannerState } from './planner-data';

describe('applyCloudCollections', () => {
  it('replaces cloud-backed collections and marks the state as cloud-ready', () => {
    const nextState = applyCloudCollections(defaultPlannerState, {
      shoppingLists: [
        {
          id: 'shopping-list-cloud-1',
          title: 'Wocheneinkauf',
          date: '2026-05-01',
          items: [
            {
              id: 'shopping-cloud-1',
              name: 'Joghurt',
              quantity: '4 Becher',
              checked: false,
            },
          ],
        },
      ],
      tasks: [
        {
          id: 'task-cloud-1',
          title: 'Turnbeutel packen',
          owner: 'Mia',
          due: '2026-05-01',
          status: 'todo',
          subtasks: [],
        },
      ],
      notes: [
        {
          id: 'note-cloud-1',
          title: 'Arztunterlagen',
          text: 'Versichertenkarte mitnehmen.',
        },
      ],
      meals: [
        {
          id: 'meal-cloud-1',
          date: '2026-06-05',
          name: 'Kartoffelgratin',
          recipe: 'Mit gruenem Salat servieren.',
        },
      ],
      documents: [
        {
          id: 'document-cloud-1',
          name: 'Reisepass',
          filePath: 'documents/reisepass.pdf',
          url: 'https://example.com/reisepass.pdf',
        },
      ],
    });

    expect(nextState.storageMode).toBe('supabase-ready');
    expect(nextState.shoppingLists).toHaveLength(1);
    expect(nextState.shoppingLists[0]?.items[0]?.name).toBe('Joghurt');
    expect(nextState.tasks).toHaveLength(1);
    expect(nextState.tasks[0]?.title).toBe('Turnbeutel packen');
    expect(nextState.notes).toHaveLength(1);
    expect(nextState.notes[0]?.title).toBe('Arztunterlagen');
    expect(nextState.meals).toHaveLength(1);
    expect(nextState.meals[0]?.name).toBe('Kartoffelgratin');
    expect(nextState.documents).toHaveLength(1);
    expect(nextState.documents[0]?.name).toBe('Reisepass');
  });
});
