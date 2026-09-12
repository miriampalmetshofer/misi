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
  onUpdateDraft: (draftId: string, name: string) => void;
};

export function ShoppingCategorySection({
  category,
  onAddDraft,
  onCheckItem,
  onDeleteItem,
  onRenameItem,
  onSaveDraft,
  onUpdateDraft,
}: ShoppingCategorySectionProps) {
  return (
    <section aria-labelledby={`category-${category.id}`}>
      <h2
        className="section-label flex min-w-0 items-center gap-2"
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
              onUpdateDraft={onUpdateDraft}
            />
          ))}
        </ul>
      )}

      <Button
        variant="outline"
        size="sm"
        className="mt-2 rounded-full border-muted-foreground"
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => onAddDraft(category.id)}
      >
        <Plus aria-hidden="true" />
        Hinzufügen
      </Button>
    </section>
  );
}
