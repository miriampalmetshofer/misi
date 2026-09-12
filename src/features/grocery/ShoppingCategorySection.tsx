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
      <h2
        className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground sm:text-base"
        id={`category-${category.id}`}
      >
        <span aria-hidden="true" className="text-base sm:text-xl">
          {category.icon}
        </span>
        <span className="min-w-0 break-words">{category.name}</span>
      </h2>

      {category.items.length > 0 && (
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

      <Button
        variant="outline"
        // h-11 meets the 44px touch minimum; the sized variants top out at 36.
        // The default border-input is ~1.3:1 here, too faint for the only
        // affordance an empty category has.
        className="mt-2 h-11 rounded-full border-muted-foreground px-4"
        // Keep this outside the list: an open draft's blur must fire before
        // this click for the draft to be saved or dropped first.
        onClick={() => onAddDraft(category.id)}
      >
        <Plus aria-hidden="true" />
        Hinzufügen
      </Button>
    </section>
  );
}
