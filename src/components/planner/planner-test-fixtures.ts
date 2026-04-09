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
  shoppingItems: [
    { id: 'shopping-1', name: 'Milch', quantity: '2', category: 'Kueche', checked: false },
  ],
  tasks: [
    { id: 'task-1', title: 'Schultasche packen', owner: 'Alex', due: 'Heute', done: false },
  ],
  notes: [
    { id: 'note-1', title: 'Hinweis', tag: 'Familie', text: 'Nicht vergessen.' },
  ],
  calendar: [
    { id: 'calendar-1', title: 'Laternenfest', date: '2026-04-09', time: '18:30', place: 'Schulhof' },
  ],
  meals: [
    { id: 'meal-1', day: 'Montag', meal: 'Nudeln', prepared: false },
  ],
  documents: [
    {
      id: 'document-1',
      name: 'Versicherung PDF',
      category: 'Dokument',
      status: 'Aktuell',
      linkUrl: 'https://example.com/versicherung.pdf',
      filePath: '',
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
  category: 'Dokument',
  status: 'Aktuell',
  linkUrl: 'https://example.com/versicherung.pdf',
  filePath: '',
};

export const documentPreviewFixture: DocumentPreviewState = {
  id: 'document-1',
  name: 'Versicherung PDF',
  url: 'https://example.com/versicherung.pdf',
  kind: 'pdf',
};