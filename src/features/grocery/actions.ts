"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNotNull, sql } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { getGroceryCategories } from "./queries";
import { normalizeItemNameSql } from "./itemNameSql";

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

  if (categoryId && getString(formData, "rememberCategory") !== "false") {
    const [items] = await db.batch([insertItem, rememberCategory(name, categoryId)]);
    revalidatePath(SHOPPING_LIST_PATH);
    return items[0];
  }

  const [item] = await insertItem;
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
    .values({ normalizedName: normalizeItemNameSql(sql`${name}`), categoryId })
    .onConflictDoUpdate({
      target: schema.groceryCategoryPreferences.normalizedName,
      set: { categoryId },
    });
}

function rememberItemCategory(itemId: string) {
  return getDb().insert(schema.groceryCategoryPreferences)
    .select(getDb().select({
      normalizedName: normalizeItemNameSql(schema.groceryItems.name).as("normalized_name"),
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

export async function saveGrocerySuggestions(formData: FormData) {
  const categoryId = getString(formData, "categoryId");
  const names = getString(formData, "suggestions")
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);

  if (names.length > 30 || names.some((name) => name.length > MAX_ITEM_NAME_LENGTH)) {
    return { error: "Bitte höchstens 30 Vorschläge mit je maximal 80 Zeichen eingeben." };
  }

  const categories = await getGroceryCategories();
  if (!categories.some((category) => category.id === categoryId)) {
    return { error: "Diese Kategorie wurde nicht gefunden." };
  }

  let original: unknown;
  try {
    original = JSON.parse(getString(formData, "original"));
  } catch {
    return { error: "Bitte die Seite neu laden und erneut versuchen." };
  }
  if (!Array.isArray(original) || !original.every((name): name is string => typeof name === "string")) {
    return { error: "Bitte die Seite neu laden und erneut versuchen." };
  }

  const seen = new Set<string>();
  const quickAddItems = names.filter((name) => {
    const key = name.toLocaleLowerCase("de-AT");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const updated = await getDb().update(schema.groceryCategories)
    .set({ quickAddItems, updatedAt: new Date() })
    .where(and(
      eq(schema.groceryCategories.id, categoryId),
      eq(schema.groceryCategories.quickAddItems, original),
    ))
    .returning({ id: schema.groceryCategories.id });
  if (!updated.length) {
    return { error: "Die Vorschläge wurden inzwischen geändert. Bitte neu laden und erneut bearbeiten." };
  }
  revalidatePath(SHOPPING_LIST_PATH);
  return { success: true };
}
