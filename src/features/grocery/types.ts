export type ShoppingListItem = {
  id: string;
  name: string;
  isChecked: boolean;
  // Never null on the way out: getShoppingListData falls back to a real
  // category for items whose column is null or points at a deleted one, and
  // every client-side path (drafts, quick add, move) carries a real id too.
  categoryId: string;
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
