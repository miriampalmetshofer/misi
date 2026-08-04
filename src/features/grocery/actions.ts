"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { normalizeGroceryItemName } from "./categories";
import {
  getGroceryCategories,
  getOrCreateHousehold,
} from "./queries";

const MAX_ITEM_NAME_LENGTH = 80;
const SHOPPING_LIST_PATH = "/einkauf";

export async function addGroceryItem(formData: FormData) {
  const name = getString(formData, "name").trim();
  const categoryId = getString(formData, "categoryId");
  const normalizedItemName = normalizeGroceryItemName(name);

  if (
    !name ||
    !categoryId ||
    !normalizedItemName ||
    name.length > MAX_ITEM_NAME_LENGTH
  ) {
    return;
  }

  const db = getDb();
  const household = await getOrCreateHousehold();
  const categories = await getGroceryCategories(household.id);

  // The UI only ever adds via a category's "+", so the category id should
  // always belong to this household. If it doesn't, refuse rather than guess.
  if (!categories.some((category) => category.id === categoryId)) {
    console.error(
      `addGroceryItem: category ${categoryId} not found for household ${household.id}`,
    );
    return;
  }

  const [item] = await db
    .insert(schema.groceryItems)
    .values({
      householdId: household.id,
      categoryId,
      name,
      normalizedName: normalizedItemName,
    })
    // Re-adding an item that already exists (e.g. one that was checked off and
    // dropped from the list) revives it: clear isChecked/lastCheckedAt so it
    // reappears on the list, and move it to the requested category.
    .onConflictDoUpdate({
      target: [
        schema.groceryItems.householdId,
        schema.groceryItems.normalizedName,
      ],
      set: {
        categoryId,
        isChecked: false,
        lastCheckedAt: null,
        name,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: schema.groceryItems.id,
      categoryId: schema.groceryItems.categoryId,
      isChecked: schema.groceryItems.isChecked,
      name: schema.groceryItems.name,
      normalizedName: schema.groceryItems.normalizedName,
    });

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
  const household = await getOrCreateHousehold();

  await db
    .update(schema.groceryItems)
    .set({
      ...(isChecked
        ? { completedCount: sql`${schema.groceryItems.completedCount} + 1` }
        : {}),
      isChecked,
      lastCheckedAt: isChecked ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.groceryItems.id, itemId),
        eq(schema.groceryItems.householdId, household.id),
      ),
    );

  revalidatePath(SHOPPING_LIST_PATH);
}

export async function deleteGroceryItem(formData: FormData) {
  const itemId = getString(formData, "itemId");

  if (!itemId) {
    return;
  }

  const db = getDb();
  const household = await getOrCreateHousehold();

  await db
    .delete(schema.groceryItems)
    .where(
      and(
        eq(schema.groceryItems.id, itemId),
        eq(schema.groceryItems.householdId, household.id),
      ),
    );

  revalidatePath(SHOPPING_LIST_PATH);
}

export async function renameGroceryItem(formData: FormData) {
  const itemId = getString(formData, "itemId");
  const rawName = getString(formData, "name");
  const name = rawName.trim();
  const normalizedItemName = normalizeGroceryItemName(name);

  if (
    !itemId ||
    !name ||
    !normalizedItemName ||
    name.length > MAX_ITEM_NAME_LENGTH
  ) {
    return;
  }

  const db = getDb();
  const household = await getOrCreateHousehold();

  // If another item already uses this name, merge into it: keep that item and
  // drop the one being renamed, so we never end up with two identical entries.
  const [existingItem] = await db
    .select({ id: schema.groceryItems.id })
    .from(schema.groceryItems)
    .where(
      and(
        eq(schema.groceryItems.householdId, household.id),
        eq(schema.groceryItems.normalizedName, normalizedItemName),
        ne(schema.groceryItems.id, itemId),
      ),
    )
    .limit(1);

  if (existingItem) {
    await db
      .update(schema.groceryItems)
      .set({ isChecked: false, lastCheckedAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(schema.groceryItems.id, existingItem.id),
          eq(schema.groceryItems.householdId, household.id),
        ),
      );

    await db
      .delete(schema.groceryItems)
      .where(
        and(
          eq(schema.groceryItems.id, itemId),
          eq(schema.groceryItems.householdId, household.id),
        ),
      );

    revalidatePath(SHOPPING_LIST_PATH);
    return;
  }

  await db
    .update(schema.groceryItems)
    .set({ name, normalizedName: normalizedItemName, updatedAt: new Date() })
    .where(
      and(
        eq(schema.groceryItems.id, itemId),
        eq(schema.groceryItems.householdId, household.id),
      ),
    );

  revalidatePath(SHOPPING_LIST_PATH);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
