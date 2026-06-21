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
  todoLists: [
    {
      id: 'todo-list-1',
      title: 'Schule',
      date: '2026-05-02',
      items: [
        { id: 'todo-1', title: 'Hefte sortieren', checked: true },
        { id: 'todo-2', title: 'Turnbeutel prüfen', checked: false },
      ],
    },
  ],
  notes: [
    { id: 'note-1', title: 'Hinweis', text: 'Nicht vergessen.' },
  ],
  meals: [
    { id: 'meal-1', date: '2026-06-02', name: 'Nudeln', recipe: 'Mit Tomatensauce.' },
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