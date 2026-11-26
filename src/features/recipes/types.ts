import {
  parseProduct,
  validProduct,
  type Product,
} from "@/features/grocery/product";

export type Recipe = {
  dishKey: string;
  name: string;
  version: number;
  products: Product[];
};

export type RecipeName = Pick<Recipe, "dishKey" | "name">;

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
