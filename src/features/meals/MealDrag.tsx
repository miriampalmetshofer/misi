"use client";

import type { ReactNode } from "react";
import { useDraggableItem } from "@/features/grocery/drag/useDraggableItem";
import { useDropTarget } from "@/features/grocery/drag/useDropTarget";
import { cn } from "@/lib/utils";
import { personLabels, type MealEntry } from "./types";

export function MealSlot({
  id,
  meals,
  children,
  ...props
}: {
  id: string;
  meals: MealEntry[];
  children: ReactNode;
  "aria-label": string;
}) {
  const target = useDropTarget({ id, items: meals });
  return (
    <section
      {...props}
      data-category-id={id}
      data-drop-target={target || undefined}
      className={cn(
        "flex flex-col py-3",
        target && "rounded-lg bg-accent ring-2 ring-primary",
      )}
    >
      {children}
    </section>
  );
}

export function MealItem({
  entry,
  disabled,
  onEdit,
}: {
  entry: MealEntry;
  disabled: boolean;
  onEdit: () => void;
}) {
  const { dragProps, isDragging, isDimmed } = useDraggableItem({
    canDrag: !disabled,
    itemId: entry.id,
    sourceCategoryId: `${entry.plannedOn}:${entry.mealTime}`,
  });
  return (
    <li
      {...dragProps}
      data-dragging={isDragging || undefined}
      className={cn(
        "relative touch-pan-y select-none [-webkit-touch-callout:none]",
        isDragging && "z-20 rounded-lg bg-background shadow-lg",
        isDimmed && "opacity-50",
      )}
    >
      <button
        type="button"
        aria-label={`${entry.name} bearbeiten`}
        aria-haspopup="dialog"
        aria-describedby={`meal-person-${entry.id}`}
        disabled={disabled}
        onClick={onEdit}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2 py-1 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default"
      >
        <span className="min-w-0 break-words text-base">{entry.name}</span>
        <span
          id={`meal-person-${entry.id}`}
          className={cn(
            "shrink-0 rounded-full px-2 py-1 text-xs font-medium",
            entry.person === "both"
              ? "bg-muted text-muted-foreground"
              : entry.person === "miriam"
                ? "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200"
                : "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
          )}
        >
          {personLabels[entry.person]}
        </span>
      </button>
    </li>
  );
}
