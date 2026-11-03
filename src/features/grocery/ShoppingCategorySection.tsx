"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  CATEGORY_DROP_GLOW_STYLES,
  CATEGORY_HEADER_STYLES,
  FALLBACK_CATEGORY_DROP_GLOW_STYLE,
  FALLBACK_CATEGORY_HEADER_STYLE,
  itemCategoryId,
  UNCATEGORIZED_ID,
} from "./categories";
import type { OptimisticShoppingListCategory } from "./types";
import { GrocerySuggestionsEditor } from "./GrocerySuggestionsEditor";
import { ShoppingItem } from "./ShoppingItem";
import { useDropTarget } from "./drag/useDropTarget";

type ShoppingCategorySectionProps = {
  category: OptimisticShoppingListCategory;
  onAddDraft: (categoryId: string | null) => void;
  onCheckItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onQuickAddItem: (name: string, categoryId: string | null) => void;
  onRenameItem: (itemId: string, name: string) => void;
  onSaveDraft: (draftId: string, name: string, categoryId: string | null) => void;
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
  const [isEditingSuggestions, setEditingSuggestions] = useState(false);
  const isDropTarget = useDropTarget(category);
  const isUncategorized = category.id === UNCATEGORIZED_ID;

  const existingItemNames = new Set(
    category.items.map((item) => normalizeItemName(item.name)),
  );
  const quickAddItems = category.quickAddItems.filter(
    (itemName) => !existingItemNames.has(normalizeItemName(itemName)),
  );

  // Checked items never reach the client (queries.ts), so this is what is
  // left to buy. Drafts have no name yet and would move the count while typing.
  const openItemCount = category.items.filter((item) => !item.isDraft).length;

  const headerStyle =
    CATEGORY_HEADER_STYLES[category.name] ?? FALLBACK_CATEGORY_HEADER_STYLE;
  const dropGlowStyle =
    CATEGORY_DROP_GLOW_STYLES[category.name] ??
    FALLBACK_CATEGORY_DROP_GLOW_STYLE;

  return (
    <section
      aria-labelledby={`category-${category.id}`}
      className={cn(
        !isUncategorized && "overflow-hidden rounded-xl border bg-card",
        "transition-[box-shadow,scale] duration-200",
        // The target lights up in its own colour rather than filling with grey,
        // which would read as disabled, and keeps its own background. Just the
        // light: a centred blurred shadow, not one of the shadow-* presets,
        // which are offset downwards and read as a drop shadow instead.
        isDropTarget &&
          "scale-[1.02] shadow-[0_0_22px_6px_var(--tw-shadow-color)]",
        isDropTarget && dropGlowStyle,
      )}
      data-category-id={category.id}
      data-drop-target={isDropTarget || undefined}
    >
      <div className={cn("flex items-center gap-3 px-3 py-2.5", !isUncategorized && headerStyle)}>
        {!isUncategorized && (
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background/70 text-lg"
          >
            {category.icon}
          </span>
        )}

        <h2
          className={cn(
            "min-w-0 flex-1 text-sm break-words",
            isUncategorized ? "font-medium text-muted-foreground" : "font-bold uppercase tracking-wider",
          )}
          id={`category-${category.id}`}
        >
          {category.name}
        </h2>

        {openItemCount > 0 && (
          <span className={cn(
            "shrink-0 text-xs tabular-nums text-muted-foreground",
            !isUncategorized && "rounded-full border bg-background/70 px-2 py-0.5",
          )}>
            {openItemCount}
          </span>
        )}
      </div>

      {category.items.length > 0 && (
        <ul className={cn("divide-y", isUncategorized ? "rounded-xl border bg-card" : "border-b")}>
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

      {!isUncategorized && (
        <div className="px-3 py-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              className="h-10 min-w-0 flex-1 justify-start px-2 font-normal text-muted-foreground hover:text-foreground"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => onAddDraft(itemCategoryId(category.id))}
            >
              <Plus aria-hidden="true" />
              Eigener Artikel
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 text-muted-foreground"
              aria-label={`${category.name}: Vorschläge bearbeiten`}
              aria-haspopup="dialog"
              aria-expanded={isEditingSuggestions}
              onClick={() => setEditingSuggestions(true)}
              disabled={isEditingSuggestions}
            >
              <Pencil aria-hidden="true" />
            </Button>
          </div>

          {isEditingSuggestions && (
            <GrocerySuggestionsEditor
              categoryId={category.id}
              categoryName={category.name}
              suggestions={category.quickAddItems}
              onClose={() => setEditingSuggestions(false)}
            />
          )}

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
                    className="h-auto min-h-9 max-w-full whitespace-normal break-words rounded-lg border-dashed px-3 py-2 font-normal text-muted-foreground shadow-none hover:text-foreground"
                    key={itemName}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => onQuickAddItem(itemName, itemCategoryId(category.id))}
                  >
                    <Plus aria-hidden="true" />
                    <span className="min-w-0">{itemName}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function normalizeItemName(name: string) {
  return name.trim().toLocaleLowerCase("de-AT");
}
