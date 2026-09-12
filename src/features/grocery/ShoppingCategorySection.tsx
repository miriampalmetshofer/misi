"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { OptimisticShoppingListCategory } from "./types";
import { ShoppingItem } from "./ShoppingItem";

type ShoppingCategorySectionProps = {
  category: OptimisticShoppingListCategory;
  onAddDraft: (categoryId: string) => void;
  onCheckItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onRenameItem: (itemId: string, name: string) => void;
  onSaveDraft: (draftId: string, name: string, categoryId: string) => void;
};

export function ShoppingCategorySection({
  category,
  onAddDraft,
  onCheckItem,
  onDeleteItem,
  onRenameItem,
  onSaveDraft,
}: ShoppingCategorySectionProps) {
  return (
    <section aria-labelledby={`category-${category.id}`}>
      <div className="flex items-center gap-3">
        <h2
          className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground sm:text-base"
          id={`category-${category.id}`}
        >
          <span aria-hidden="true" className="text-base sm:text-xl">
            {category.icon}
          </span>
          <span className="min-w-0 break-words">{category.name}</span>
        </h2>

        <Button
          variant="outline"
          size="icon-lg"
          aria-label={`${category.name} hinzufügen`}
          className="ml-auto rounded-full"
          // An open draft's blur fires before this click, so the typed item is
          // saved before a fresh draft replaces it. Keep this button outside
          // the list: hiding or moving it on save would swallow the click.
          onClick={() => onAddDraft(category.id)}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>

      {category.items.length === 0 ? (
        <p className="mt-3 text-sm leading-snug text-muted-foreground sm:text-base">
          Noch nichts in dieser Kategorie.
        </p>
      ) : (
        <ul className="mt-3 space-y-0">
          {category.items.map((item) => (
            <ShoppingItem
              item={item}
              key={item.id}
              onCheck={onCheckItem}
              onDelete={onDeleteItem}
              onRename={onRenameItem}
              onSaveDraft={onSaveDraft}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
