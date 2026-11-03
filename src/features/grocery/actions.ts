"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNotNull, sql } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { getGroceryCategories } from "./queries";
import { normalizeItemName } from "./categories";

const MAX_ITEM_NAME_LENGTH = 80;
const SHOPPING_LIST_PATH = "/einkauf";

export async function addGroceryItem(formData: FormData) {
  const name = getString(formData, "name").trim();
  const categoryId = getString(formData, "categoryId") || null;

  if (!name || name.length > MAX_ITEM_NAME_LENGTH) {
    return;
  }

  const db = getDb();
  const categories = await getGroceryCategories();

  if (categoryId && !categories.some((category) => category.id === categoryId)) {
    console.error(`addGroceryItem: category ${categoryId} not found`);
    return;
  }

  const insertItem = db
    .insert(schema.groceryItems)
    .values({ categoryId, name })
    .returning({
      id: schema.groceryItems.id,
      categoryId: schema.groceryItems.categoryId,
      isChecked: schema.groceryItems.isChecked,
      name: schema.groceryItems.name,
    });

  const [[item]] = categoryId && getString(formData, "rememberCategory") !== "false"
    ? await db.batch([insertItem, rememberCategory(name, categoryId)])
    : [await insertItem];

  revalidatePath(SHOPPING_LIST_PATH);
  return item;
}

export async function setGroceryItemChecked(formData: FormData) {
  const itemId = getString(formData, "itemId");
  const isChecked = getString(formData, "isChecked") === "true";

  if (!itemId) {
    return;
  }

  const db = getDb();

  await db
    .update(schema.groceryItems)
    .set({ isChecked, updatedAt: new Date() })
    .where(eq(schema.groceryItems.id, itemId));

  revalidatePath(SHOPPING_LIST_PATH);
}

export async function deleteGroceryItem(formData: FormData) {
  const itemId = getString(formData, "itemId");

  if (!itemId) {
    return;
  }

  const db = getDb();

  await db
    .delete(schema.groceryItems)
    .where(eq(schema.groceryItems.id, itemId));

  revalidatePath(SHOPPING_LIST_PATH);
}

export async function renameGroceryItem(formData: FormData) {
  const itemId = getString(formData, "itemId");
  const name = getString(formData, "name").trim();

  if (!itemId || !name || name.length > MAX_ITEM_NAME_LENGTH) {
    return;
  }

  const db = getDb();

  await db.batch([
    db.update(schema.groceryItems)
      .set({ name, updatedAt: new Date() })
      .where(eq(schema.groceryItems.id, itemId)),
    rememberItemCategory(itemId),
  ]);

  revalidatePath(SHOPPING_LIST_PATH);
}

export async function moveGroceryItem(formData: FormData) {
  const itemId = getString(formData, "itemId");
  const categoryId = getString(formData, "categoryId") || null;

  if (!itemId) {
    return;
  }

  const categories = await getGroceryCategories();

  if (categoryId && !categories.some((category) => category.id === categoryId)) {
    console.error(`moveGroceryItem: category ${categoryId} not found`);
    return;
  }

  const db = getDb();

  await db.batch([
    db.update(schema.groceryItems)
      .set({ categoryId, updatedAt: new Date() })
      .where(eq(schema.groceryItems.id, itemId)),
    rememberItemCategory(itemId),
  ]);

  revalidatePath(SHOPPING_LIST_PATH);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function rememberCategory(name: string, categoryId: string) {
  return getDb().insert(schema.groceryCategoryPreferences)
    .values({ normalizedName: normalizeItemName(name), categoryId })
    .onConflictDoUpdate({
      target: schema.groceryCategoryPreferences.normalizedName,
      set: { categoryId },
    });
}

function rememberItemCategory(itemId: string) {
  return getDb().insert(schema.groceryCategoryPreferences)
    .select(getDb().select({
      normalizedName: sql<string>`lower(trim(regexp_replace(${schema.groceryItems.name}, '\\s+', ' ', 'g')))`.as("normalized_name"),
      categoryId: sql<string>`${schema.groceryItems.categoryId}`.as("category_id"),
    }).from(schema.groceryItems).where(and(
      eq(schema.groceryItems.id, itemId),
      isNotNull(schema.groceryItems.categoryId),
    )))
    .onConflictDoUpdate({
      target: schema.groceryCategoryPreferences.normalizedName,
      set: { categoryId: sql`excluded.category_id` },
    });
}
