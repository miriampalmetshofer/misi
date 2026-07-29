import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDb, schema } from "@/db";
import {
  DEFAULT_GROCERY_CATEGORIES,
  FALLBACK_GROCERY_CATEGORY,
} from "./categories";

export type ShoppingListItem = {
  id: string;
  name: string;
  normalizedName: string;
  isChecked: boolean;
  categoryId: string | null;
  isDraft?: boolean;
  isSyncing?: boolean;
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

export async function getShoppingListData(): Promise<ShoppingListData> {
  const db = getDb();
  const household = await getOrCreateHousehold();
  const categories = await getGroceryCategories(household.id);

  const items = await db
    .select({
      id: schema.groceryItems.id,
      name: schema.groceryItems.name,
      normalizedName: schema.groceryItems.normalizedName,
      isChecked: schema.groceryItems.isChecked,
      categoryId: schema.groceryItems.categoryId,
    })
    .from(schema.groceryItems)
    .where(
      and(
        eq(schema.groceryItems.householdId, household.id),
        eq(schema.groceryItems.isChecked, false),
      ),
    )
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
      normalizedName: item.normalizedName,
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

export async function getOrCreateHousehold() {
  const db = getDb();
  const [existingHousehold] = await db
    .select()
    .from(schema.households)
    .orderBy(asc(schema.households.createdAt))
    .limit(1);

  if (existingHousehold) {
    return existingHousehold;
  }

  const [household] = await db
    .insert(schema.households)
    .values({ name: "Zuhause" })
    .returning();

  // Seed the default categories once, when the household is first created,
  // rather than reconstructing them on every read. onConflictDoNothing guards
  // the rare concurrent-create case.
  await db
    .insert(schema.groceryCategories)
    .values(
      DEFAULT_GROCERY_CATEGORIES.map((category) => ({
        householdId: household.id,
        name: category.name,
        icon: category.icon,
        sortOrder: category.sortOrder,
      })),
    )
    .onConflictDoNothing();

  return household;
}

export async function getGroceryCategories(householdId: string) {
  const db = getDb();
  // The DB is the source of truth: sortOrder is seeded from
  // DEFAULT_GROCERY_CATEGORIES, so the SQL ORDER BY is already the intended
  // order, and every stored category is returned (no default-name filter).
  return db
    .select()
    .from(schema.groceryCategories)
    .where(eq(schema.groceryCategories.householdId, householdId))
    .orderBy(
      asc(schema.groceryCategories.sortOrder),
      asc(schema.groceryCategories.name),
    );
}
