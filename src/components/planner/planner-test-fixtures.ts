import type { AuthState, CloudSyncState, DocumentEditState, DocumentPreviewState } from '../../app/types';
import type { PlannerState, TabId } from '../../lib/planner-data';

export const plannerFixture: PlannerState = {
  familyName: 'Familie Test',
  activeUserId: 'member-admin',
  storageMode: 'local',
  members: [
    { id: 'member-admin', name: 'Alex Admin', email: 'alex@example.com', role: 'admin' },
    { id: 'member-user', name: 'Bea User', email: 'bea@example.com', role: 'familyuser' },
  ],
  shoppingLists: [
    {
      id: 'shopping-list-1',
      title: 'Wocheneinkauf',
      date: '2026-05-04',
      items: [
        { id: 'shopping-1', name: 'Milch', quantity: '2', checked: false },
      ],
    },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Schultasche packen',
      owner: 'Alex',
      due: '2026-05-02',
      status: 'todo',
      subtasks: [
        { id: 'task-1-subtask-1', title: 'Hefte sortieren', done: true },
        { id: 'task-1-subtask-2', title: 'Turnbeutel prüfen', done: false },
      ],
    },
  ],
  notes: [
    { id: 'note-1', title: 'Hinweis', text: 'Nicht vergessen.' },
  ],
  meals: [
    { id: 'meal-1', day: 'Montag', meal: 'Nudeln', prepared: false },
  ],
  documents: [
    {
      id: 'document-1',
      name: 'Versicherung PDF',
      filePath: 'documents/versicherung.pdf',
      url: 'https://example.com/versicherung.pdf',
    },
  ],
};

export const authFixture: AuthState = {
  stage: 'authenticated',
  session: null,
  profile: {
    id: 'member-admin',
    email: 'alex@example.com',
    display_name: 'Alex Admin',
    role: 'admin',
  },
  family: {
    familyId: 'family-1',
    familyName: 'Familie Test',
    role: 'admin',
    ownerUserId: 'member-admin',
    isOwner: true,
    allowOpenRegistration: true,
  },
  error: null,
  message: null,
};

export const cloudSyncFixture: CloudSyncState = {
  phase: 'idle',
  message: null,
  scope: null,
};

export const visibleTabsFixture: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'shopping', label: 'Einkauf' },
  { id: 'family', label: 'Familie' },
];

export const documentEditFixture: DocumentEditState = {
  id: 'document-1',
  name: 'Versicherung PDF',
  filePath: 'documents/versicherung.pdf',
};

export const documentPreviewFixture: DocumentPreviewState = {
  id: 'document-1',
  name: 'Versicherung PDF',
  url: 'https://example.com/versicherung.pdf',
  kind: 'pdf',
};