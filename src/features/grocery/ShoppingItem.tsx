"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { OptimisticShoppingListItem } from "./types";
import { useDraggableItem } from "./drag/useDraggableItem";

type ShoppingItemRowProps = {
  item: OptimisticShoppingListItem;
  onCheck: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onRename: (itemId: string, name: string) => void;
  onSaveDraft: (draftId: string, name: string, categoryId: string) => void;
  onUpdateDraft: (draftId: string, name: string) => void;
};

export function ShoppingItem({
  item,
  onCheck,
  onDelete,
  onRename,
  onSaveDraft,
  onUpdateDraft,
}: ShoppingItemRowProps) {
  const [isEditing, setIsEditing] = useState(item.isDraft ?? false);
  const [draft, setDraft] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isPersisted = !item.isDraft && !item.isSyncing;
  const { dragProps, isDragging, isDimmed } = useDraggableItem({
    canDrag: isPersisted && !isEditing,
    itemId: item.id,
    sourceCategoryId: item.categoryId,
  });

  useEffect(() => {
    if (!isEditing || !inputRef.current) {
      return;
    }

    const input = inputRef.current;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [isEditing]);

  function save() {
    if (item.isDraft) {
      const nextName = draft.trim();

      if (nextName) {
        setIsEditing(false);
      }

      onSaveDraft(item.id, nextName, item.categoryId);
      return;
    }

    const nextName = draft.trim();
    setIsEditing(false);

    if (nextName && nextName !== item.name) {
      onRename(item.id, nextName);
    }
  }

  function cancel(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape") {
      return;
    }

    if (item.isDraft) {
      onDelete(item.id);
      return;
    }

    setDraft(item.name);
    setIsEditing(false);
  }

  return (
    <li
      className={cn(
        "relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-1 data-[syncing=true]:opacity-70",
        // Never transition transform: it would lag behind the per-frame
        // position writes the drag controller makes.
        "transition-[box-shadow,opacity,scale,background-color]",
        // iOS starts selecting text during the long press itself, before the
        // drag begins, and shows its selection handles over the row. Suppress
        // it up front rather than once dragging: by then the selection exists.
        // The name is a button, not prose, so nothing selectable is lost.
        isPersisted && "touch-pan-y select-none [-webkit-touch-callout:none]",
        // Elevation rather than a ring, so nothing is drawn through the
        // checkbox at the start of the row.
        isDragging && "z-20 scale-[1.02] rounded-xl bg-background shadow-lg",
        isDimmed && "opacity-50",
      )}
      data-dragging={isDragging || undefined}
      data-draggable={isPersisted || undefined}
      data-syncing={item.isSyncing}
      {...dragProps}
    >
      <Checkbox
        aria-label={`${item.name || "Artikel"} erledigt markieren`}
        // The default border-input sits at 1.26:1 against the background,
        // under the 3:1 WCAG asks of a control boundary. It is fine for a
        // checkbox next to a form label, but this one is the primary tap
        // target on an otherwise empty row, so it needs a visible edge.
        className="size-5 rounded-full border-muted-foreground"
        disabled={item.isDraft || item.isSyncing}
        onCheckedChange={() => onCheck(item.id)}
      />

      {isEditing ? (
        <Input
          aria-label={`${item.name || "Artikel"} bearbeiten`}
          className="h-auto rounded-none border-0 bg-transparent p-0 leading-snug focus-visible:ring-0"
          maxLength={80}
          ref={inputRef}
          value={draft}
          onBlur={save}
          onChange={(event) => {
            setDraft(event.target.value);

            if (item.isDraft) {
              onUpdateDraft(item.id, event.target.value);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }

            cancel(event);
          }}
        />
      ) : (
        <Button
          variant="ghost"
          // Matches Input's own text-base/md:text-sm ramp so the name keeps
          // its size when the row switches into edit mode.
          className="h-auto min-w-0 justify-start break-words px-0 text-base font-normal whitespace-normal hover:bg-transparent md:text-sm"
          disabled={item.isSyncing}
          onClick={() => {
            setDraft(item.name);
            setIsEditing(true);
          }}
        >
          {item.name}
        </Button>
      )}

      {/* Always render the trailing controls so their grid column keeps a
          constant width and height; hide them when not editing to avoid a
          layout shift (the row was reflowing as this column appeared). */}
      <div
        className="flex items-center gap-1 data-[hidden=true]:pointer-events-none data-[hidden=true]:invisible"
        data-hidden={!isEditing}
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${item.name || "Artikel"} löschen`}
          aria-hidden={!isEditing}
          tabIndex={isEditing ? undefined : -1}
          className="rounded-full text-muted-foreground"
          disabled={item.isSyncing}
          // Keep the input focused on mousedown: blurring it would run save(),
          // leave edit mode and hide this button before the click could land.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onDelete(item.id)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
