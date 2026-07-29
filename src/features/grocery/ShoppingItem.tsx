"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";

import type { ShoppingListItem } from "./queries";

type ShoppingItemRowProps = {
  item: ShoppingListItem;
  onCheck: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onRename: (itemId: string, name: string) => void;
  onSaveDraft: (draftId: string, name: string, categoryId: string) => void;
};

export function ShoppingItem({
  item,
  onCheck,
  onDelete,
  onRename,
  onSaveDraft,
}: ShoppingItemRowProps) {
  const [isEditing, setIsEditing] = useState(item.isDraft ?? false);
  const [draft, setDraft] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);

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

      onSaveDraft(item.id, nextName, item.categoryId ?? "");
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
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg py-1 data-[syncing=true]:opacity-70"
      data-syncing={item.isSyncing}
    >
      <button
        type="button"
        aria-label={`${item.name || "Artikel"} erledigt markieren`}
        className="flex size-7 items-center justify-center rounded-full border-2 border-neutral-300 text-sm text-white"
        disabled={item.isDraft || item.isSyncing}
        onClick={() => onCheck(item.id)}
      />

      {isEditing ? (
        <input
          aria-label={`${item.name || "Artikel"} bearbeiten`}
          className="min-w-0 bg-transparent p-0 text-base leading-snug text-neutral-800 outline-none sm:text-lg"
          maxLength={80}
          ref={inputRef}
          value={draft}
          onBlur={save}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }

            cancel(event);
          }}
        />
      ) : (
        <button
          type="button"
          className="min-w-0 break-words text-left text-base leading-snug text-neutral-800 sm:text-lg"
          disabled={item.isSyncing}
          onClick={() => {
            setDraft(item.name);
            setIsEditing(true);
          }}
        >
          {item.name}
        </button>
      )}

      {/* Always render the delete button so its grid column keeps a constant
          width and height; hide it when not editing to avoid a layout shift
          (the row was reflowing as this column appeared/disappeared). */}
      <button
        type="button"
        aria-label={`${item.name || "Artikel"} löschen`}
        aria-hidden={!isEditing}
        tabIndex={isEditing ? undefined : -1}
        className="flex size-8 items-center justify-center rounded-full text-xl leading-none text-neutral-300 transition hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50 data-[hidden=true]:pointer-events-none data-[hidden=true]:invisible"
        data-hidden={!isEditing}
        disabled={item.isSyncing}
        onClick={() => onDelete(item.id)}
      >
        ×
      </button>
    </li>
  );
}
