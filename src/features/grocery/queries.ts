import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDb, schema } from "@/db";
import {
  DEFAULT_GROCERY_CATEGORIES,
  FALLBACK_GROCERY_CATEGORY,
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

  const categoryIds = new Set(categories.map((category) => category.id));
  const fallbackCategoryId =
    categories.find((category) => category.name === FALLBACK_GROCERY_CATEGORY)
      ?.id ?? categories.at(-1)?.id;
  const categoryItems = new Map<string, ShoppingListItem[]>();

  for (const item of items) {
    const categoryId =
      item.categoryId && categoryIds.has(item.categoryId)
        ? item.categoryId
        : fallbackCategoryId;

    if (!categoryId) {
      continue;
    }

    const existing = categoryItems.get(categoryId) ?? [];
    existing.push({
      id: item.id,
      name: item.name,
      isChecked: item.isChecked,
      categoryId,
    });
    categoryItems.set(categoryId, existing);
  }

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      items: categoryItems.get(category.id) ?? [],
    })),
  };
}

export async function getGroceryCategories() {
  const db = getDb();
  // The DB is the source of truth: sortOrder is seeded from
  // DEFAULT_GROCERY_CATEGORIES, so the SQL ORDER BY is already the intended
  // order, and every stored category is returned (no default-name filter).
  const existing = await selectGroceryCategories();

  if (existing.length > 0) {
    return existing;
  }

  // First run on an empty database: seed the defaults once.
  // onConflictDoNothing guards the rare concurrent-create case.
  await db
    .insert(schema.groceryCategories)
    .values(DEFAULT_GROCERY_CATEGORIES.map((category) => ({ ...category })))
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
