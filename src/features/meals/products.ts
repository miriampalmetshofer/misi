import {
  parseProduct,
  validProduct,
  type Product,
} from "@/features/grocery/product";

export type ShoppingReviewRow = Product & {
  existing: { id: string; quantity: number } | null;
};

export type DishProducts = Record<string, Product[]>;
export const MAX_DISH_PRODUCTS = 30;

export function parseDishProducts(text: string) {
  const products = text
    .split("\n")
    .filter((line) => line.trim())
    .map(parseProduct);
  return products.length <= MAX_DISH_PRODUCTS && products.every(validProduct)
    ? products
    : null;
}

export function productsForDish(dishes: DishProducts, key: string): Product[] {
  return Object.hasOwn(dishes, key) ? dishes[key] : [];
}
