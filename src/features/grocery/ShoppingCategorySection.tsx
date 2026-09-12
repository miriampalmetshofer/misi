"use client";

import { Plus } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  CATEGORY_HEADER_STYLES,
  FALLBACK_CATEGORY_HEADER_STYLE,
  QUICK_ADD_GROCERY_ITEMS,
} from "./categories";
import type { OptimisticShoppingListCategory } from "./types";
import { ShoppingItem } from "./ShoppingItem";
import { useDrag } from "./drag/DragContext";

type ShoppingCategorySectionProps = {
  categories: OptimisticShoppingListCategory[];
  category: OptimisticShoppingListCategory;
  onAddDraft: (categoryId: string) => void;
  onCheckItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onMoveItem: (itemId: string, categoryId: string) => void;
  onQuickAddItem: (name: string, categoryId: string) => void;
  onRenameItem: (itemId: string, name: string) => void;
  onSaveDraft: (draftId: string, name: string, categoryId: string) => void;
  onUpdateDraft: (draftId: string, name: string) => void;
};

export function ShoppingCategorySection({
  categories,
  category,
  onAddDraft,
  onCheckItem,
  onDeleteItem,
  onMoveItem,
  onQuickAddItem,
  onRenameItem,
  onSaveDraft,
  onUpdateDraft,
}: ShoppingCategorySectionProps) {
  const { draggedItemId, dropCategoryId } = useDrag();
  // Highlighting the category the item already sits in would tell the user a
  // drop there does something; it does not.
  const isDropTarget =
    draggedItemId !== null &&
    dropCategoryId === category.id &&
    !category.items.some((item) => item.id === draggedItemId);

  const existingItemNames = new Set(
    category.items.map((item) => normalizeItemName(item.name)),
  );
  const quickAddItems = (QUICK_ADD_GROCERY_ITEMS[category.name] ?? []).filter(
    (itemName) => !existingItemNames.has(normalizeItemName(itemName)),
  );

  // Checked items never reach the client (queries.ts), so this is what is
  // left to buy. Drafts have no name yet and would move the count while typing.
  const openItemCount = category.items.filter((item) => !item.isDraft).length;

  const headerStyle =
    CATEGORY_HEADER_STYLES[category.name] ?? FALLBACK_CATEGORY_HEADER_STYLE;

  return (
    <section
      aria-labelledby={`category-${category.id}`}
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-colors",
        // Inset, so the highlight never draws a line through a row's checkbox.
        isDropTarget && "bg-muted ring-1 ring-inset ring-ring/40",
      )}
      data-category-id={category.id}
      data-drop-target={isDropTarget || undefined}
    >
      <div className={`flex items-center gap-3 px-3 py-2.5 ${headerStyle}`}>
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background/70 text-lg"
        >
          {category.icon}
        </span>

        <h2
          className="min-w-0 flex-1 text-sm font-bold uppercase tracking-wider break-words"
          id={`category-${category.id}`}
        >
          {category.name}
        </h2>

        {openItemCount > 0 && (
          <span className="shrink-0 rounded-full border bg-background/70 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {openItemCount}
          </span>
        )}
      </div>

      {category.items.length > 0 && (
        <ul className="divide-y border-b">
          {category.items.map((item) => (
            <ShoppingItem
              categories={categories}
              item={item}
              key={item.id}
              onCheck={onCheckItem}
              onDelete={onDeleteItem}
              onMove={onMoveItem}
              onRename={onRenameItem}
              onSaveDraft={onSaveDraft}
              onUpdateDraft={onUpdateDraft}
            />
          ))}
        </ul>
      )}

      <div className="px-3 py-2">
        <Button
          variant="ghost"
          className="h-9 w-full justify-start px-2 font-normal text-muted-foreground hover:text-foreground"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => onAddDraft(category.id)}
        >
          <Plus aria-hidden="true" />
          Eigener Artikel
        </Button>

        {quickAddItems.length > 0 && (
          <div className="mt-3 px-2 pb-1">
            <p className="section-label">Vorschläge</p>

            <div
              aria-label={`${category.name} schnell hinzufügen`}
              className="mt-2 flex flex-wrap gap-2"
            >
              {quickAddItems.map((itemName) => (
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`${itemName} schnell hinzufügen`}
                  className="h-9 rounded-lg border-dashed px-3 font-normal text-muted-foreground shadow-none hover:text-foreground"
                  key={itemName}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => onQuickAddItem(itemName, category.id)}
                >
                  <Plus aria-hidden="true" />
                  {itemName}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function normalizeItemName(name: string) {
  return name.trim().toLocaleLowerCase("de-AT");
}
