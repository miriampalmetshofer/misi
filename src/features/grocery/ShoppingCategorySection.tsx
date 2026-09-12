"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { QUICK_ADD_GROCERY_ITEMS } from "./categories";
import type { OptimisticShoppingListCategory } from "./types";
import { ShoppingItem } from "./ShoppingItem";

type ShoppingCategorySectionProps = {
  category: OptimisticShoppingListCategory;
  onAddDraft: (categoryId: string) => void;
  onCheckItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onQuickAddItem: (name: string, categoryId: string) => void;
  onRenameItem: (itemId: string, name: string) => void;
  onSaveDraft: (draftId: string, name: string, categoryId: string) => void;
  onUpdateDraft: (draftId: string, name: string) => void;
};

export function ShoppingCategorySection({
  category,
  onAddDraft,
  onCheckItem,
  onDeleteItem,
  onQuickAddItem,
  onRenameItem,
  onSaveDraft,
  onUpdateDraft,
}: ShoppingCategorySectionProps) {
  const existingItemNames = new Set(
    category.items.map((item) => normalizeItemName(item.name)),
  );
  const quickAddItems = (QUICK_ADD_GROCERY_ITEMS[category.name] ?? []).filter(
    (itemName) => !existingItemNames.has(normalizeItemName(itemName)),
  );

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

      {/* Suggestions and the custom-item button are one control group: same
          shape, same row. They answer the same question ("what do I add?"),
          so splitting them across two rows made the rarer custom action look
          like the primary one. */}
      <div
        aria-label={`${category.name} hinzufügen`}
        className="mt-3 flex flex-wrap gap-2"
      >
        {/* Leads the row, but stays the quieter of the two: suggestions are
            the common path. Once they are all used up this is the category's
            only way to add anything, so it takes over the filled style rather
            than being left as the faintest thing in the section. */}
        <Button
          variant={quickAddItems.length > 0 ? "ghost" : "secondary"}
          className="rounded-full border-0 px-3 font-normal shadow-none hover:bg-accent hover:text-foreground data-[muted=true]:text-muted-foreground"
          data-muted={quickAddItems.length > 0}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => onAddDraft(category.id)}
        >
          <Plus aria-hidden="true" />
          Eigener Artikel
        </Button>
        {quickAddItems.map((itemName) => (
          <Button
            variant="secondary"
            aria-label={`${itemName} schnell hinzufügen`}
            className="rounded-full border-0 bg-muted px-3 font-normal text-foreground shadow-none hover:bg-accent"
            key={itemName}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onQuickAddItem(itemName, category.id)}
          >
            <Plus aria-hidden="true" />
            {itemName}
          </Button>
        ))}
      </div>
    </section>
  );
}

function normalizeItemName(name: string) {
  return name.trim().toLocaleLowerCase("de-AT");
}
