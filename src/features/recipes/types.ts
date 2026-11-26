import { validProduct, type Product } from "@/features/grocery/product";

export type Recipe = {
  dishKey: string;
  name: string;
  version: number;
  products: Product[];
};

export type RecipeName = Pick<Recipe, "dishKey" | "name">;

export const MAX_DISH_PRODUCTS = 30;

export function parseDishProducts(form: FormData): Product[] | null {
  const names = form.getAll("productName");
  const quantities = form.getAll("productQuantity");
  if (names.length !== quantities.length || names.length > MAX_DISH_PRODUCTS)
    return null;

  const products: Product[] = [];
  for (const [index, value] of names.entries()) {
    const count = quantities[index];
    if (
      typeof value !== "string" ||
      typeof count !== "string" ||
      !/^\d+$/.test(count)
    )
      return null;
    const product = { name: value.trim(), quantity: Number(count) };
    if (!product.name && product.quantity === 1) continue;
    if (!validProduct(product)) return null;
    products.push(product);
  }
  return products;
}
