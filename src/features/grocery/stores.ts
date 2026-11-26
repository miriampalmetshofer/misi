import { normalizeItemName } from "./categories";
import { parseProduct } from "./product";
import type { GroceryStorePreferences } from "./types";

export const GROCERY_STORES = [
  { id: "spar", name: "SPAR" },
  { id: "hofer", name: "HOFER" },
  { id: "billa", name: "BILLA" },
] as const;

export type GroceryStore = (typeof GROCERY_STORES)[number]["id"];

export function parseGroceryStores(values: unknown[]): GroceryStore[] {
  return GROCERY_STORES.filter(({ id }) => values.includes(id)).map(({ id }) => id);
}

export function storesForItem(preferences: GroceryStorePreferences, name: string): GroceryStore[] {
  const key = normalizeItemName(parseProduct(name).name);
  return (Object.hasOwn(preferences, key) && preferences[key]) || [];
}
