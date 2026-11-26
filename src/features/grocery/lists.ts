export const SHOPPING_LIST_NAMES = {
  groceries: "Lebensmittel",
  dm: "DM",
  obi: "OBI",
} as const;

export type ShoppingListId = keyof typeof SHOPPING_LIST_NAMES;

export function parseShoppingList(value: unknown): ShoppingListId {
  return value === "dm" || value === "obi" ? value : "groceries";
}
