import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDb, schema } from "@/db";
import {
  DEFAULT_GROCERY_CATEGORIES,
  UNCATEGORIZED_ID,
  QUICK_ADD_GROCERY_ITEMS,
} from "./categories";
import type { ShoppingListData, ShoppingListItem } from "./types";

export async function getShoppingListData(): Promise<ShoppingListData> {
  const db = getDb();
  const categories = await getGroceryCategories();

  const items = await db
    .select({
      id: schema.groceryItems.id,
      name: schema.groceryItems.name,
      isChecked: schema.groceryItems.isChecked,
      categoryId: schema.groceryItems.categoryId,
    })
    .from(schema.groceryItems)
    .where(eq(schema.groceryItems.isChecked, false))
    .orderBy(asc(schema.groceryItems.createdAt));

  const categoryItems = new Map<string, ShoppingListItem[]>();

  for (const item of items) {
    const key = item.categoryId ?? UNCATEGORIZED_ID;
    const existing = categoryItems.get(key) ?? [];
    existing.push(item);
    categoryItems.set(key, existing);
  }

  const preferences = await db.select().from(schema.groceryCategoryPreferences);

  return {
    categoryPreferences: Object.fromEntries(
      preferences.map((preference) => [preference.normalizedName, preference.categoryId]),
    ),
    categories: [
      ...categories,
      { id: UNCATEGORIZED_ID, name: "Noch nicht zugeordnet", icon: "🏷️", quickAddItems: [] },
    ].map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      quickAddItems: category.quickAddItems,
      items: categoryItems.get(category.id) ?? [],
    })),
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
