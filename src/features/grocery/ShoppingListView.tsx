"use client";

import type { ShoppingListCategory } from "./queries";
import { ShoppingCategorySection } from "./ShoppingCategorySection";

type ShoppingListViewProps = {
  categories: ShoppingListCategory[];
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
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
        <div className="flex items-center gap-2 text-base text-neutral-600 sm:text-lg">
          <span aria-hidden="true" className="text-2xl leading-none sm:text-3xl">
            ‹
          </span>
          <span>Home</span>
        </div>

        <h1 className="mt-12 text-4xl font-bold leading-none tracking-normal sm:mt-14 sm:text-5xl">
          Einkaufsliste
        </h1>

        <div className="mt-10 space-y-10 sm:mt-12 sm:space-y-12">
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
