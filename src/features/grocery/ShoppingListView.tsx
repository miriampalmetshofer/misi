"use client";

import Link from "next/link";

import type { OptimisticShoppingListCategory } from "./types";
import { ShoppingCategorySection } from "./ShoppingCategorySection";

type ShoppingListViewProps = {
  categories: OptimisticShoppingListCategory[];
  onAddDraft: (categoryId: string) => void;
  onCheckItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onRenameItem: (itemId: string, name: string) => void;
  onSaveDraft: (draftId: string, name: string, categoryId: string) => void;
};

export function ShoppingListView({
  categories,
  onAddDraft,
  onCheckItem,
  onDeleteItem,
  onRenameItem,
  onSaveDraft,
}: ShoppingListViewProps) {
  return (
    <div className="min-h-screen bg-stone-50 text-base text-neutral-950">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <Link href="/" className="page-back-link">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>Home</span>
        </Link>

        <h1 className="page-headline">Einkaufsliste</h1>

        <div className="mt-8 space-y-5 sm:mt-12 sm:space-y-8">
          {categories.map((category) => (
            <ShoppingCategorySection
              category={category}
              key={category.id}
              onAddDraft={onAddDraft}
              onCheckItem={onCheckItem}
              onDeleteItem={onDeleteItem}
              onRenameItem={onRenameItem}
              onSaveDraft={onSaveDraft}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
