import { describe, expect, it } from 'vitest';
import { applyCloudCollections } from './cloud-sync';
import { defaultPlannerState } from './planner-data';

describe('applyCloudCollections', () => {
  it('replaces cloud-backed collections and marks the state as cloud-ready', () => {
    const nextState = applyCloudCollections(defaultPlannerState, {
      shoppingItems: [
        {
          id: 'shopping-cloud-1',
          name: 'Joghurt',
          quantity: '4 Becher',
          category: 'Frische',
          checked: false,
        },
      ],
      tasks: [
        {
          id: 'task-cloud-1',
          title: 'Turnbeutel packen',
          owner: 'Mia',
          due: 'Morgen',
          done: false,
        },
      ],
      notes: [
        {
          id: 'note-cloud-1',
          title: 'Arztunterlagen',
          text: 'Versichertenkarte mitnehmen.',
        },
      ],
      calendar: [
        {
          id: 'calendar-cloud-1',
          title: 'Zahnarzt',
          date: 'Freitag',
          time: '08:30',
          place: 'Innenstadt',
        },
      ],
      meals: [
        {
          id: 'meal-cloud-1',
          day: 'Freitag',
          meal: 'Kartoffelgratin',
          prepared: true,
        },
      ],
      documents: [
        {
          id: 'document-cloud-1',
          name: 'Reisepass',
          category: 'Behörden',
          status: 'Vorhanden',
          linkUrl: 'https://example.com/reisepass.pdf',
          filePath: '',
        },
      ],
    });

    expect(nextState.storageMode).toBe('supabase-ready');
    expect(nextState.shoppingItems).toHaveLength(1);
    expect(nextState.shoppingItems[0]?.name).toBe('Joghurt');
    expect(nextState.tasks).toHaveLength(1);
    expect(nextState.tasks[0]?.title).toBe('Turnbeutel packen');
    expect(nextState.notes).toHaveLength(1);
    expect(nextState.notes[0]?.title).toBe('Arztunterlagen');
    expect(nextState.calendar).toHaveLength(1);
    expect(nextState.calendar[0]?.title).toBe('Zahnarzt');
    expect(nextState.meals).toHaveLength(1);
    expect(nextState.meals[0]?.meal).toBe('Kartoffelgratin');
    expect(nextState.documents).toHaveLength(1);
    expect(nextState.documents[0]?.name).toBe('Reisepass');
  });
});
