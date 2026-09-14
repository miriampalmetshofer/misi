"use client";

import { useDrag } from "./DragContext";

type DropTargetCategory = {
  id: string;
  items: { id: string }[];
};

export function useDropTarget(category: DropTargetCategory) {
  const { draggedItemId, dropCategoryId } = useDrag();

  // Highlighting the category the item already sits in would tell the user a
  // drop there does something; it does not.
  return (
    draggedItemId !== null &&
    dropCategoryId === category.id &&
    !category.items.some((item) => item.id === draggedItemId)
  );
}
