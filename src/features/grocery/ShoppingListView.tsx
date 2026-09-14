"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import type { OptimisticShoppingListCategory } from "./types";
import { ShoppingCategorySection } from "./ShoppingCategorySection";
import { DragProvider } from "./drag/DragContext";

type ShoppingListViewProps = {
  categories: OptimisticShoppingListCategory[];
  onAddDraft: (categoryId: string) => void;
  onCheckItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onMoveItem: (itemId: string, categoryId: string) => void;
  onQuickAddItem: (name: string, categoryId: string) => void;
  onRenameItem: (itemId: string, name: string) => void;
  onSaveDraft: (draftId: string, name: string, categoryId: string) => void;
  onUpdateDraft: (draftId: string, name: string) => void;
};

export function ShoppingListView({
  categories,
  onAddDraft,
  onCheckItem,
  onDeleteItem,
  onMoveItem,
  onQuickAddItem,
  onRenameItem,
  onSaveDraft,
  onUpdateDraft,
}: ShoppingListViewProps) {
  const openItemCount = categories.reduce(
    (total, category) =>
      total + category.items.filter((item) => !item.isDraft).length,
    0,
  );

  return (
    // The lifted row is translated out of its slot and would otherwise stretch
    // the document as it travels, letting the drag scroll on past the list into
    // empty space. Clipping contains it without introducing a scroll container.
    // The margin keeps the row itself whole: the edge auto-scroll deliberately
    // stops with the finger a little past the end of the content, so a clip
    // flush against the box would cut the row off exactly while the user is
    // aiming at the last category.
    <div className="min-h-screen overflow-clip [overflow-clip-margin:6rem] bg-background text-base text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <Link href="/" className="page-back-link">
          <ChevronLeft aria-hidden="true" className="size-4" />
          <span>Home</span>
        </Link>

        <h1 className="page-headline">Einkaufsliste</h1>

        {/* Checked items never reach the client (queries.ts), so a
            "done of total" pair would always read zero. */}
        <p className="mt-2 text-sm text-muted-foreground">
          {openItemCount === 0
            ? "Nichts offen"
            : `${openItemCount} Artikel offen`}
        </p>

        <DragProvider onMoveItem={onMoveItem}>
          <div className="mt-8 space-y-3 sm:mt-12 sm:space-y-4">
            {categories.map((category) => (
              <ShoppingCategorySection
                category={category}
                key={category.id}
                onAddDraft={onAddDraft}
                onCheckItem={onCheckItem}
                onDeleteItem={onDeleteItem}
                onQuickAddItem={onQuickAddItem}
                onRenameItem={onRenameItem}
                onSaveDraft={onSaveDraft}
                onUpdateDraft={onUpdateDraft}
              />
            ))}
          </div>
        </DragProvider>
      </main>
    </div>
  );
}
