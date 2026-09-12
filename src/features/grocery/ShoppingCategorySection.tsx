"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CATEGORY_HEADER_STYLES,
  FALLBACK_CATEGORY_HEADER_STYLE,
  QUICK_ADD_GROCERY_ITEMS,
} from "./categories";
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

  // A draft has no name yet, so counting it would move the total while the
  // user is still typing. Checked items are filtered out server-side (see
  // queries.ts), so this is how many are still to buy — a "done/total" pair
  // could only ever read 0/n.
  const openItemCount = category.items.filter((item) => !item.isDraft).length;

  const headerStyle =
    CATEGORY_HEADER_STYLES[category.name] ?? FALLBACK_CATEGORY_HEADER_STYLE;

  return (
    <section
      aria-labelledby={`category-${category.id}`}
      className="overflow-hidden rounded-xl border bg-card"
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

            {/* Dashed outline marks these as "not on the list yet", which is
                what tells them apart from the solid item rows above. */}
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
