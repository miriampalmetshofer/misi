import { ShoppingList } from "@/features/grocery/ShoppingList";
import { getShoppingListData } from "@/features/grocery/queries";

export const dynamic = "force-dynamic";

export default async function EinkaufPage() {
  const shoppingList = await getShoppingListData();

  return <ShoppingList categories={shoppingList.categories} />;
}
