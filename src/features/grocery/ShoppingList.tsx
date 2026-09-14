"use client";

import { useOptimistic, useState } from "react";

import {
  addGroceryItem,
  deleteGroceryItem,
  moveGroceryItem,
  renameGroceryItem,
  setGroceryItemChecked,
} from "./actions";
import type {
  OptimisticShoppingListCategory,
  OptimisticShoppingListItem,
  ShoppingListCategory,
  ShoppingListItem,
} from "./types";
import { ShoppingListView } from "./ShoppingListView";
import { useOptimisticMutation } from "@/lib/useOptimisticMutation";
import { useUndo } from "./useUndo";

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
  | { type: "move"; itemId: string; categoryId: string }
  | { type: "rename"; itemId: string; name: string }
  | { type: "remove"; itemId: string }
  | { type: "restore"; item: ShoppingListItem; index: number };

export function ShoppingList({
  categories: persistedCategories,
}: ShoppingListProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [categories, addOptimistic] = useOptimistic(
    persistedCategories,
    reduce,
  );
  const { mutate } = useOptimisticMutation(addOptimistic);
  const undo = useUndo<{ item: ShoppingListItem; index: number }>();

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

  function quickAddItem(name: string, categoryId: string) {
    const currentDraft = drafts[0];

    if (currentDraft) {
      setDrafts([]);

      const nextName = currentDraft.name.trim();
      if (nextName) {
        addItem(nextName, currentDraft.categoryId);
      }
    }

    addItem(name, categoryId);
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

  function moveItem(itemId: string, categoryId: string) {
    if (isClientOnlyId(itemId)) return;

    mutate(
      moveGroceryItem,
      { itemId, categoryId },
      { type: "move", itemId, categoryId },
    );
  }

  function checkItem(itemId: string) {
    const found = findItem(categories, itemId);

    mutate(
      setGroceryItemChecked,
      { itemId, isChecked: "true" },
      { type: "remove", itemId },
    );

    // No isClientOnlyId guard as in rename/delete: the checkbox is disabled
    // while syncing, so a row reaching here always has a real uuid.
    if (found) {
      undo.push(`${found.item.name} erledigt`, found);
    }
  }

  function undoCheck() {
    const offer = undo.offer;
    if (!offer) {
      return;
    }

    undo.clear();
    mutate(
      setGroceryItemChecked,
      { itemId: offer.payload.item.id, isChecked: "false" },
      { type: "restore", ...offer.payload },
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
      categories={withDrafts(categories, drafts)}
      onAddDraft={createDraftItem}
      onCheckItem={checkItem}
      onDeleteItem={deleteItem}
      onMoveItem={moveItem}
      onQuickAddItem={quickAddItem}
      onRenameItem={renameItem}
      onSaveDraft={saveDraftItem}
      onUndoCheck={undoCheck}
      onUpdateDraft={updateDraft}
      undo={undo.offer && { id: undo.offer.id, label: undo.offer.label }}
    />
  );
}

/** The item with that id, plus the position it holds in its category. */
function findItem(
  categories: OptimisticShoppingListCategory[],
  itemId: string,
): { item: ShoppingListItem; index: number } | undefined {
  for (const category of categories) {
    const index = category.items.findIndex((item) => item.id === itemId);

    if (index !== -1) {
      const { id, name, isChecked, categoryId } = category.items[index];
      // Deliberately rebuilt rather than spread: isDraft/isSyncing are
      // client-only flags that must not survive into a restored row.
      return { item: { id, name, isChecked, categoryId }, index };
    }
  }
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
    case "move": {
      const targetCategoryExists = categories.some(
        (category) => category.id === action.categoryId,
      );

      if (!targetCategoryExists) {
        return categories;
      }

      const movedItem = categories
        .flatMap((category) => category.items)
        .find((item) => item.id === action.itemId);

      if (!movedItem || movedItem.categoryId === action.categoryId) {
        return categories;
      }

      return categories.map((category) => {
        if (category.id === action.categoryId) {
          return {
            ...category,
            items: [
              ...category.items,
              {
                ...movedItem,
                categoryId: action.categoryId,
                isSyncing: true,
              },
            ],
          };
        }

        return {
          ...category,
          items: category.items.filter((item) => item.id !== action.itemId),
        };
      });
    }
    case "remove":
      return categories.map((category) => ({
        ...category,
        items: category.items.filter((item) => item.id !== action.itemId),
      }));
    case "restore": {
      // The server may already have sent the restored row back before the
      // pending action stops replaying, and the same category is the only
      // place it can be. Without this the replay splices in a second copy.
      const alreadyBack = categories.some((category) =>
        category.items.some((item) => item.id === action.item.id),
      );
      if (alreadyBack) {
        return categories;
      }

      // The item's category can have been removed during the undo window, so
      // fall back to the same last category the server assigns orphans to.
      const target =
        categories.find((category) => category.id === action.item.categoryId) ??
        categories.at(-1);

      return categories.map((category) => {
        if (category !== target) {
          return category;
        }

        // The server orders by createdAt, which the client does not have. The
        // row's own index from before it was checked off stands in for it, so an
        // undo puts the row back where it was instead of at the end. It is
        // clamped because other rows may have gone in the meantime.
        const items = [...category.items];
        items.splice(Math.min(action.index, items.length), 0, action.item);

        return { ...category, items };
      });
    }
  }
}
