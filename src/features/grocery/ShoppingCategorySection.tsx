"use client";

import type { ShoppingListCategory } from "./queries";
import { ShoppingItem } from "./ShoppingItem";

type ShoppingCategorySectionProps = {
  category: ShoppingListCategory;
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
          className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500 sm:text-base"
          id={`category-${category.id}`}
        >
          <span aria-hidden="true" className="text-base sm:text-xl">
            {category.icon}
          </span>
          <span className="min-w-0 break-words">{category.name}</span>
        </h2>

        <button
          type="button"
          aria-label={`${category.name} hinzufügen`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-transparent text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-700 sm:size-10"
          // Keep focus on any open draft input so its onBlur runs *after* this
          // click; without this, blurring removes a row and the layout shift
          // swallows the click before onAddDraft fires.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onAddDraft(category.id)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="size-4"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {category.items.length === 0 ? (
        <p className="mt-3 text-sm leading-snug text-neutral-400 sm:text-base">
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
