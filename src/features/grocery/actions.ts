"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";

import { getDb, schema } from "@/db";
import {
  FALLBACK_GROCERY_CATEGORY,
  normalizeGroceryItemName,
} from "./categories";
import {
  getGroceryCategories,
  getOrCreateHousehold,
} from "./queries";

const MAX_ITEM_NAME_LENGTH = 80;
const SHOPPING_LIST_PATH = "/einkauf";

export async function addGroceryItem(formData: FormData) {
  const rawName = formData.get("name");
  const requestedCategoryId = formData.get("categoryId");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const normalizedItemName = normalizeGroceryItemName(name);

  if (!name || !normalizedItemName || name.length > MAX_ITEM_NAME_LENGTH) {
    return;
  }

  const db = getDb();
  const household = await getOrCreateHousehold();
  const categories = await getGroceryCategories(household.id);
  const categoryIds = new Set(categories.map((category) => category.id));
  const explicitCategoryId =
    typeof requestedCategoryId === "string" &&
    categoryIds.has(requestedCategoryId)
      ? requestedCategoryId
      : null;

  const categoryId =
    explicitCategoryId ??
    (await getPreferredCategoryId(household.id, normalizedItemName)) ??
    categories.find((category) => category.name === FALLBACK_GROCERY_CATEGORY)
      ?.id ??
    categories.at(-1)?.id;

  if (!categoryId) {
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

  if (explicitCategoryId) {
    await rememberPreferredCategory(
      household.id,
      explicitCategoryId,
      normalizedItemName,
    );
  }

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
    return;
  }

  const [item] = await db
    .update(schema.groceryItems)
    .set({ name, normalizedName: normalizedItemName, updatedAt: new Date() })
    .where(
      and(
        eq(schema.groceryItems.id, itemId),
        eq(schema.groceryItems.householdId, household.id),
      ),
    )
    .returning({
      categoryId: schema.groceryItems.categoryId,
    });

  if (item?.categoryId) {
    await rememberPreferredCategory(
      household.id,
      item.categoryId,
      normalizedItemName,
    );
  }

  revalidatePath(SHOPPING_LIST_PATH);
}

async function getPreferredCategoryId(
  householdId: string,
  normalizedItemName: string,
) {
  const db = getDb();
  const [preference] = await db
    .select({ categoryId: schema.groceryItemCategoryPreferences.categoryId })
    .from(schema.groceryItemCategoryPreferences)
    .where(
      and(
        eq(schema.groceryItemCategoryPreferences.householdId, householdId),
        eq(
          schema.groceryItemCategoryPreferences.normalizedItemName,
          normalizedItemName,
        ),
      ),
    )
    .limit(1);

  return preference?.categoryId;
}

async function rememberPreferredCategory(
  householdId: string,
  categoryId: string,
  normalizedItemName: string,
) {
  const db = getDb();

  await db
    .insert(schema.groceryItemCategoryPreferences)
    .values({
      householdId,
      categoryId,
      normalizedItemName,
    })
    .onConflictDoUpdate({
      target: [
        schema.groceryItemCategoryPreferences.householdId,
        schema.groceryItemCategoryPreferences.normalizedItemName,
      ],
      set: {
        categoryId,
        updatedAt: new Date(),
      },
    });
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
