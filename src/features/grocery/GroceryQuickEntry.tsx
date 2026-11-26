"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { itemCategoryId, normalizeItemName, UNCATEGORIZED_ID } from "./categories";
import { MAX_PRODUCT_INPUT_LENGTH, parseProduct, validProduct } from "./product";
import type { ShoppingListCategory } from "./types";

type Props = {
  categories: ShoppingListCategory[];
  categoryPreferences: Record<string, string>;
  showCategories?: boolean;
  onAdd: (name: string, categoryId: string | null, rememberCategory: boolean) => void;
};

export function GroceryQuickEntry({
  categories,
  categoryPreferences,
  showCategories = true,
  onAdd,
}: Props) {
  const [name, setName] = useState("");
  const [selection, setSelection] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const product = parseProduct(name);
  const canAdd = validProduct(product);
  const remembered = categoryPreferences[normalizeItemName(product.name)];
  const categoryId = selection ?? (
    categories.some((category) => category.id === remembered)
      ? remembered : UNCATEGORIZED_ID
  );

  return (
    <div className="pointer-events-auto border-t bg-background pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <form
        aria-label="Artikel schnell hinzufügen"
        className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-5 sm:px-8"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = name.trim();
          if (!canAdd) return;
          onAdd(
            trimmed,
            itemCategoryId(categoryId),
            selection !== null && categoryId !== UNCATEGORIZED_ID,
          );
          setName("");
          setSelection(null);
          inputRef.current?.focus();
        }}
      >
        <div className="flex gap-2">
          <Input
            aria-label="Artikel hinzufügen"
            autoComplete="off"
            className="h-11 min-w-0 flex-1"
            enterKeyHint="done"
            maxLength={MAX_PRODUCT_INPUT_LENGTH}
            placeholder="Was brauchst du?"
            ref={inputRef}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          <Button
            aria-label="Artikel zur Liste hinzufügen"
            className="size-11 shrink-0"
            disabled={!canAdd}
            type="submit"
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
        {showCategories && (
          <select
            aria-label="Kategorie für neuen Artikel"
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground md:text-sm"
            value={categoryId}
            onChange={(event) => setSelection(event.target.value)}
          >
            <option value={UNCATEGORIZED_ID}>Kategorie wählen (optional)</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.icon} {category.name}</option>
            ))}
          </select>
        )}
      </form>
    </div>
  );
}
