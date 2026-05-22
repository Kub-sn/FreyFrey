export type UserRole = 'admin' | 'familyuser';

export type FamilyMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type ShoppingListItem = {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
};

export type ShoppingList = {
  id: string;
  title: string;
  date: string;
  items: ShoppingListItem[];
};

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export type TaskSubtask = {
  id: string;
  title: string;
  done: boolean;
};

export type TaskItem = {
  id: string;
  title: string;
  owner: string;
  due: string;
  status: TaskStatus;
  subtasks: TaskSubtask[];
};

export type NoteItem = {
  id: string;
  title: string;
  text: string;
};

export type CalendarItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  place: string;
};

export type MealItem = {
  id: string;
  day: string;
  meal: string;
  prepared: boolean;
};

export type DocumentItem = {
  id: string;
  name: string;
  filePath: string;
  url: string;
};

export type PlannerState = {
  activeUserId: string;
  familyName: string;
  storageMode: 'local' | 'supabase-ready';
  members: FamilyMember[];
  shoppingLists: ShoppingList[];
  tasks: TaskItem[];
  notes: NoteItem[];
  calendar: CalendarItem[];
  meals: MealItem[];
  documents: DocumentItem[];
};

export const tabs = [
  { id: 'overview', label: 'Überblick' },
  { id: 'shopping', label: 'Einkauf' },
  { id: 'tasks', label: 'To-dos' },
  { id: 'notes', label: 'Notizen' },
  { id: 'calendar', label: 'Kalender' },
  { id: 'meals', label: 'Essensplan' },
  { id: 'documents', label: 'Dokumente' },
  { id: 'family', label: 'Einstellungen' },
] as const;

export type TabId = (typeof tabs)[number]['id'];

export const defaultPlannerState: PlannerState = {
  activeUserId: '',
  familyName: 'Meine Familie',
  storageMode: 'local',
  members: [],
  shoppingLists: [],
  tasks: [],
  notes: [],
  calendar: [],
  meals: [],
  documents: [],
};