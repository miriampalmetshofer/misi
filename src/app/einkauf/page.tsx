import type { Viewport } from "next";

import { ShoppingList } from "@/features/grocery/ShoppingList";
import { getShoppingListData } from "@/features/grocery/queries";

export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export const dynamic = "force-dynamic";

export default async function EinkaufPage() {
  const shoppingList = await getShoppingListData();

  return <ShoppingList {...shoppingList} />;
}
