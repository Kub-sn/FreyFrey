import type {
  CalendarItem,
  DocumentItem,
  MealItem,
  NoteItem,
  PlannerState,
  ShoppingList,
  TaskItem,
} from './planner-data';

type CloudCollections = {
  shoppingLists: ShoppingList[];
  tasks: TaskItem[];
  notes: NoteItem[];
  calendar: CalendarItem[];
  meals: MealItem[];
  documents: DocumentItem[];
};

export function applyCloudCollections(
  current: PlannerState,
  collections: CloudCollections,
): PlannerState {
  const shoppingChanged = JSON.stringify(current.shoppingLists) !== JSON.stringify(collections.shoppingLists);
  const tasksChanged = JSON.stringify(current.tasks) !== JSON.stringify(collections.tasks);
  const notesChanged = JSON.stringify(current.notes) !== JSON.stringify(collections.notes);
  const calendarChanged = JSON.stringify(current.calendar) !== JSON.stringify(collections.calendar);
  const mealsChanged = JSON.stringify(current.meals) !== JSON.stringify(collections.meals);
  const documentsChanged =
    JSON.stringify(current.documents) !== JSON.stringify(collections.documents);

  if (
    !shoppingChanged &&
    !tasksChanged &&
    !notesChanged &&
    !calendarChanged &&
    !mealsChanged &&
    !documentsChanged &&
    current.storageMode === 'supabase-ready'
  ) {
    return current;
  }

  return {
    ...current,
    storageMode: 'supabase-ready',
    shoppingLists: collections.shoppingLists,
    tasks: collections.tasks,
    notes: collections.notes,
    calendar: collections.calendar,
    meals: collections.meals,
    documents: collections.documents,
  };
}