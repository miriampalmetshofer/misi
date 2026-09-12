import { describe, expect, it } from "vitest";

import { reduce, withDrafts } from "./ShoppingList";
import type { OptimisticShoppingListCategory } from "./types";

function categories(): OptimisticShoppingListCategory[] {
  return [
    {
      id: "obst",
      name: "Obst",
      icon: "🍎",
      items: [{ id: "apfel", name: "Äpfel", isChecked: false, categoryId: "obst" }],
    },
    { id: "gebaeck", name: "Gebäck", icon: "🥐", items: [] },
  ];
}

describe("reduce", () => {
  it("appends an added item to its own category only", () => {
    const next = reduce(categories(), {
      type: "add",
      itemId: "pending-1",
      name: "Semmeln",
      categoryId: "gebaeck",
    });

    expect(next[0].items).toHaveLength(1);
    expect(next[1].items).toEqual([
      {
        id: "pending-1",
        categoryId: "gebaeck",
        isChecked: false,
        isSyncing: true,
        name: "Semmeln",
      },
    ]);
  });

  it("marks an added item as syncing so the row reads as not-yet-saved", () => {
    const [obst] = reduce(categories(), {
      type: "add",
      itemId: "pending-1",
      name: "Birnen",
      categoryId: "obst",
    });

    expect(obst.items.at(-1)?.isSyncing).toBe(true);
  });

  it("renames the matching item and leaves the rest untouched", () => {
    const next = reduce(categories(), {
      type: "rename",
      itemId: "apfel",
      name: "Grüne Äpfel",
    });

    expect(next[0].items[0].name).toBe("Grüne Äpfel");
    expect(next[0].items[0].id).toBe("apfel");
  });

  it("removes the matching item", () => {
    const next = reduce(categories(), { type: "remove", itemId: "apfel" });

    expect(next[0].items).toEqual([]);
  });

  it("moves the matching item to another category", () => {
    const next = reduce(categories(), {
      type: "move",
      itemId: "apfel",
      categoryId: "gebaeck",
    });

    expect(next[0].items).toEqual([]);
    expect(next[1].items).toEqual([
      {
        id: "apfel",
        name: "Äpfel",
        isChecked: false,
        categoryId: "gebaeck",
        isSyncing: true,
      },
    ]);
  });

  it("ignores moves to the current category", () => {
    const before = categories();

    expect(
      reduce(before, { type: "move", itemId: "apfel", categoryId: "obst" }),
    ).toEqual(before);
  });

  it("ignores actions for unknown ids", () => {
    const before = categories();

    expect(reduce(before, { type: "remove", itemId: "nope" })).toEqual(before);
    expect(
      reduce(before, { type: "rename", itemId: "nope", name: "X" }),
    ).toEqual(before);
    expect(
      reduce(before, { type: "move", itemId: "nope", categoryId: "gebaeck" }),
    ).toEqual(before);
  });
});

describe("withDrafts", () => {
  it("returns the categories unchanged when there is no draft", () => {
    const before = categories();

    expect(withDrafts(before, [])).toBe(before);
  });

  it("appends an empty draft row to the drafting category", () => {
    const next = withDrafts(categories(), [
      { id: "draft-1", categoryId: "gebaeck", name: "" },
    ]);

    expect(next[0].items).toHaveLength(1);
    expect(next[1].items).toEqual([
      {
        id: "draft-1",
        categoryId: "gebaeck",
        isChecked: false,
        isDraft: true,
        name: "",
      },
    ]);
  });

  it("keeps the draft row's typed name", () => {
    const next = withDrafts(categories(), [
      { id: "draft-1", categoryId: "gebaeck", name: "Semmeln" },
    ]);

    expect(next[1].items[0].name).toBe("Semmeln");
  });
});
