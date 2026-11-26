import type { Viewport } from "next";

import { ShoppingList } from "@/features/grocery/ShoppingList";
import { parseShoppingList } from "@/features/grocery/lists";
import { getShoppingListData } from "@/features/grocery/queries";

export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export const dynamic = "force-dynamic";

export default async function EinkaufPage({
  searchParams,
}: {
  searchParams: Promise<{ liste?: string | string[] }>;
}) {
  const listId = parseShoppingList((await searchParams).liste);
  const shoppingList = await getShoppingListData(listId);

  return <ShoppingList key={listId} listId={listId} {...shoppingList} />;
}
