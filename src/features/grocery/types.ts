export type ShoppingListItem = {
  id: string;
  name: string;
  isChecked: boolean;
  categoryId: string | null;
};

export type ShoppingListCategory = {
  id: string;
  name: string;
  icon: string;
  items: ShoppingListItem[];
};

export type ShoppingListData = {
  categories: ShoppingListCategory[];
};

// Client-only: optimistic UI state for items that are not yet persisted.
// The server never sets these, so they stay off the types it returns.
export type OptimisticShoppingListItem = ShoppingListItem & {
  isDraft?: boolean;
  isSyncing?: boolean;
};

export type OptimisticShoppingListCategory = Omit<
  ShoppingListCategory,
  "items"
> & {
  items: OptimisticShoppingListItem[];
};
