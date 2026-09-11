"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { getGroceryCategories } from "./queries";

const MAX_ITEM_NAME_LENGTH = 80;
const SHOPPING_LIST_PATH = "/einkauf";

export async function addGroceryItem(formData: FormData) {
  const name = getString(formData, "name").trim();
  const categoryId = getString(formData, "categoryId");

  if (!name || !categoryId || name.length > MAX_ITEM_NAME_LENGTH) {
    return;
  }

  const db = getDb();
  const categories = await getGroceryCategories();

  // The UI only ever adds via a category's "+", so the category id should
  // always exist. If it doesn't, refuse rather than guess.
  if (!categories.some((category) => category.id === categoryId)) {
    console.error(`addGroceryItem: category ${categoryId} not found`);
    return;
  }

  const [item] = await db
    .insert(schema.groceryItems)
    .values({ categoryId, name })
    .returning({
      id: schema.groceryItems.id,
      categoryId: schema.groceryItems.categoryId,
      isChecked: schema.groceryItems.isChecked,
      name: schema.groceryItems.name,
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

  await db
    .update(schema.groceryItems)
    .set({ name, updatedAt: new Date() })
    .where(eq(schema.groceryItems.id, itemId));

  revalidatePath(SHOPPING_LIST_PATH);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
