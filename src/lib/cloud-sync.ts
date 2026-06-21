import type {
  DocumentItem,
  MealItem,
  NoteItem,
  PlannerState,
  ShoppingList,
  TodoList,
} from './planner-data';

type CloudCollections = {
  shoppingLists: ShoppingList[];
  todoLists: TodoList[];
  notes: NoteItem[];
  meals: MealItem[];
  documents: DocumentItem[];
};

export function applyCloudCollections(
  current: PlannerState,
  collections: CloudCollections,
): PlannerState {
  const shoppingChanged = JSON.stringify(current.shoppingLists) !== JSON.stringify(collections.shoppingLists);
  const todoListsChanged = JSON.stringify(current.todoLists) !== JSON.stringify(collections.todoLists);
  const notesChanged = JSON.stringify(current.notes) !== JSON.stringify(collections.notes);
  const mealsChanged = JSON.stringify(current.meals) !== JSON.stringify(collections.meals);
  const documentsChanged =
    JSON.stringify(current.documents) !== JSON.stringify(collections.documents);

  if (
    !shoppingChanged &&
    !todoListsChanged &&
    !notesChanged &&
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
    todoLists: collections.todoLists,
    notes: collections.notes,
    meals: collections.meals,
    documents: collections.documents,
  };
}