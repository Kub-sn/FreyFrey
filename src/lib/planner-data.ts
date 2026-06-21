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
  quantity?: string;
  checked: boolean;
};

export type ShoppingList = {
  id: string;
  title: string;
  date: string;
  items: ShoppingListItem[];
};

export type TodoListItem = {
  id: string;
  title: string;
  checked: boolean;
};

export type TodoList = {
  id: string;
  title: string;
  date?: string;
  items: TodoListItem[];
};

export type NoteItem = {
  id: string;
  title: string;
  text: string;
};

export type MealItem = {
  id: string;
  date: string;
  name: string;
  recipe: string;
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
  todoLists: TodoList[];
  notes: NoteItem[];
  meals: MealItem[];
  documents: DocumentItem[];
};

export const tabs = [
  { id: 'overview', label: 'Überblick' },
  { id: 'shopping', label: 'Einkauf' },
  { id: 'tasks', label: 'To-dos' },
  { id: 'notes', label: 'Notizen' },
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
  todoLists: [],
  notes: [],
  meals: [],
  documents: [],
};