"use client";

import { useOptimistic, useState } from "react";

import {
  addGroceryItem,
  deleteGroceryItem,
  renameGroceryItem,
  setGroceryItemChecked,
} from "./actions";
import type {
  OptimisticShoppingListCategory,
  OptimisticShoppingListItem,
  ShoppingListCategory,
} from "./types";
import { ShoppingListView } from "./ShoppingListView";
import { useOptimisticMutation } from "@/lib/useOptimisticMutation";

type ShoppingListProps = {
  categories: ShoppingListCategory[];
};

type Draft = { id: string; categoryId: string; name: string };

// Ids the client makes up for rows the database does not have yet: an open
// draft row, and an added item still waiting for its server-assigned uuid.
const DRAFT_ID_PREFIX = "draft-";
const PENDING_ID_PREFIX = "pending-";

function isClientOnlyId(itemId: string) {
  return (
    itemId.startsWith(DRAFT_ID_PREFIX) || itemId.startsWith(PENDING_ID_PREFIX)
  );
}

type OptimisticAction =
  | { type: "add"; itemId: string; name: string; categoryId: string }
  | { type: "rename"; itemId: string; name: string }
  | { type: "remove"; itemId: string };

export function ShoppingList({ categories }: ShoppingListProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [optimisticCategories, applyOptimistic] = useOptimistic(
    categories,
    reduce,
  );
  const { mutate } = useOptimisticMutation(applyOptimistic);

  const categoriesWithDrafts = withDrafts(optimisticCategories, drafts);

  function createDraftItem(categoryId: string) {
    const currentDraft = drafts[0];

    if (currentDraft) {
      const nextName = currentDraft.name.trim();

      if (nextName) {
        addItem(nextName, currentDraft.categoryId);
      } else if (currentDraft.categoryId === categoryId) {
        return currentDraft.id;
      }
    }

    const draftId = `${DRAFT_ID_PREFIX}${crypto.randomUUID()}`;
    // One draft at a time: replace any open draft with the new one.
    setDrafts([{ id: draftId, categoryId, name: "" }]);
    return draftId;
  }

  function removeDraft(draftId: string) {
    setDrafts((current) => current.filter((draft) => draft.id !== draftId));
  }

  function updateDraft(draftId: string, name: string) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId ? { ...draft, name } : draft,
      ),
    );
  }

  function addItem(name: string, categoryId: string) {
    const itemId = `${PENDING_ID_PREFIX}${crypto.randomUUID()}`;
    mutate(
      addGroceryItem,
      { name, categoryId },
      { type: "add", itemId, name, categoryId },
    );
  }

  function saveDraftItem(draftId: string, name: string, categoryId: string) {
    removeDraft(draftId);

    const nextName = name.trim();
    if (!nextName) {
      return;
    }

    addItem(nextName, categoryId);
  }

  function renameItem(itemId: string, name: string) {
    const nextName = name.trim();
    if (!nextName || isClientOnlyId(itemId)) return;

    mutate(
      renameGroceryItem,
      { itemId, name: nextName },
      { type: "rename", itemId, name: nextName },
    );
  }

  function checkItem(itemId: string) {
    mutate(
      setGroceryItemChecked,
      { itemId, isChecked: "true" },
      { type: "remove", itemId },
    );
  }

  function deleteItem(itemId: string) {
    removeDraft(itemId);

    // Drafts and not-yet-saved items only exist on the client, so their ids
    // are not the uuids the database stores. Dropping the local row is the
    // whole deletion; sending the id on would fail the uuid cast.
    if (isClientOnlyId(itemId)) {
      return;
    }

    mutate(deleteGroceryItem, { itemId }, { type: "remove", itemId });
  }

  return (
    <ShoppingListView
      categories={categoriesWithDrafts}
      onAddDraft={createDraftItem}
      onCheckItem={checkItem}
      onDeleteItem={deleteItem}
      onRenameItem={renameItem}
      onSaveDraft={saveDraftItem}
      onUpdateDraft={updateDraft}
    />
  );
}

export function withDrafts(
  categories: OptimisticShoppingListCategory[],
  drafts: Draft[],
): OptimisticShoppingListCategory[] {
  if (drafts.length === 0) {
    return categories;
  }

  return categories.map((category) => {
    const categoryDrafts = drafts.filter(
      (draft) => draft.categoryId === category.id,
    );
    if (categoryDrafts.length === 0) {
      return category;
    }

    return {
      ...category,
      items: [
        ...category.items,
        ...categoryDrafts.map(
          (draft): OptimisticShoppingListItem => ({
            id: draft.id,
            categoryId: draft.categoryId,
            isChecked: false,
            isDraft: true,
            name: draft.name,
          }),
        ),
      ],
    };
  });
}

export function reduce(
  categories: OptimisticShoppingListCategory[],
  action: OptimisticAction,
): OptimisticShoppingListCategory[] {
  switch (action.type) {
    case "add":
      return categories.map((category) => {
        if (category.id !== action.categoryId) {
          return category;
        }

        return {
          ...category,
          items: [
            ...category.items,
            {
              id: action.itemId,
              categoryId: action.categoryId,
              isChecked: false,
              isSyncing: true,
              name: action.name,
            },
          ],
        };
      });
    case "rename":
      return categories.map((category) => ({
        ...category,
        items: category.items.map((item) =>
          item.id === action.itemId ? { ...item, name: action.name } : item,
        ),
      }));
    case "remove":
      return categories.map((category) => ({
        ...category,
        items: category.items.filter((item) => item.id !== action.itemId),
      }));
  }
}
