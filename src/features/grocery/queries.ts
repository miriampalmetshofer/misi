import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDb, schema } from "@/db";
import {
  DEFAULT_GROCERY_CATEGORIES,
  UNCATEGORIZED_ID,
  QUICK_ADD_GROCERY_ITEMS,
} from "./categories";
import { parseGroceryStores } from "./stores";
import { formatProduct } from "./product";
import type { ShoppingListId } from "./lists";
import type { ShoppingListData, ShoppingListItem } from "./types";

export async function getShoppingListData(listId: ShoppingListId = "groceries"): Promise<ShoppingListData> {
  const db = getDb();

  const items = await db
    .select({
      id: schema.groceryItems.id,
      name: schema.groceryItems.name,
      quantity: schema.groceryItems.quantity,
      isChecked: schema.groceryItems.isChecked,
      categoryId: schema.groceryItems.categoryId,
    })
    .from(schema.groceryItems)
    .where(and(eq(schema.groceryItems.isChecked, false), eq(schema.groceryItems.listId, listId)))
    .orderBy(asc(schema.groceryItems.createdAt));

  const categoryItems = new Map<string, ShoppingListItem[]>();

  for (const { quantity, ...item } of items) {
    const key = item.categoryId ?? UNCATEGORIZED_ID;
    const existing = categoryItems.get(key) ?? [];
    existing.push({ ...item, name: formatProduct({ name: item.name, quantity }) });
    categoryItems.set(key, existing);
  }

  const uncategorized = {
    id: UNCATEGORIZED_ID,
    name: "Noch nicht zugeordnet",
    icon: "🏷️",
    quickAddItems: [],
    items: categoryItems.get(UNCATEGORIZED_ID) ?? [],
  };
  if (listId !== "groceries") {
    return { categories: [uncategorized], categoryPreferences: {}, storePreferences: {} };
  }

  const categories = await getGroceryCategories();
  const preferences = await db.select().from(schema.groceryCategoryPreferences);

  const storePreferences = await db.select().from(schema.groceryStorePreferences);

  return {
    storePreferences: Object.fromEntries(
      storePreferences.map(({ normalizedName, stores }) => [normalizedName, parseGroceryStores(stores)]),
    ),
    categoryPreferences: Object.fromEntries(
      preferences.map((preference) => [preference.normalizedName, preference.categoryId]),
    ),
    categories: [
      ...categories.map(({ id, name, icon, quickAddItems }) => ({
        id, name, icon, quickAddItems, items: categoryItems.get(id) ?? [],
      })),
      uncategorized,
    ],
  };
}

export async function getGroceryCategories() {
  const db = getDb();
  const existing = await selectGroceryCategories();

  if (existing.length > 0) {
    return existing;
  }

  // First run on an empty database: seed the defaults once.
  // onConflictDoNothing guards the rare concurrent-create case.
  await db
    .insert(schema.groceryCategories)
    .values(DEFAULT_GROCERY_CATEGORIES.map((category) => ({
      ...category,
      quickAddItems: QUICK_ADD_GROCERY_ITEMS[category.name] ?? [],
    })))
    .onConflictDoNothing();

  return selectGroceryCategories();
}

function selectGroceryCategories() {
  return getDb()
    .select()
    .from(schema.groceryCategories)
    .orderBy(
      asc(schema.groceryCategories.sortOrder),
      asc(schema.groceryCategories.name),
    );
}
