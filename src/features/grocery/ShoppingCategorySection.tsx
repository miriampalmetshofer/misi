"use client";

import { Plus } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  CATEGORY_DROP_GLOW_STYLES,
  CATEGORY_HEADER_STYLES,
  FALLBACK_CATEGORY_DROP_GLOW_STYLE,
  FALLBACK_CATEGORY_HEADER_STYLE,
  QUICK_ADD_GROCERY_ITEMS,
  itemCategoryId,
  UNCATEGORIZED_ID,
} from "./categories";
import type { OptimisticShoppingListCategory } from "./types";
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
  const isDropTarget = useDropTarget(category);
  const isUncategorized = category.id === UNCATEGORIZED_ID;

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
          <Button
            variant="ghost"
            className="h-9 w-full justify-start px-2 font-normal text-muted-foreground hover:text-foreground"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onAddDraft(itemCategoryId(category.id))}
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
                    onClick={() => onQuickAddItem(itemName, itemCategoryId(category.id))}
                  >
                    <Plus aria-hidden="true" />
                    {itemName}
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
