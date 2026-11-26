import type { Product } from "@/features/grocery/product";

export type ShoppingReviewRow = Product & {
  existing: { id: string; quantity: number } | null;
};
