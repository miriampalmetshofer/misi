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

  it("puts a restored item back at the position it held", () => {
    const withThree = categories();
    withThree[0].items = [
      { id: "a", name: "A", isChecked: false, categoryId: "obst" },
      { id: "c", name: "C", isChecked: false, categoryId: "obst" },
    ];

    const next = reduce(withThree, {
      type: "restore",
      item: { id: "b", name: "B", isChecked: false, categoryId: "obst" },
      index: 1,
    });

    expect(next[0].items.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("restores into the item's own category only", () => {
    const next = reduce(categories(), {
      type: "restore",
      item: { id: "semmeln", name: "Semmeln", isChecked: false, categoryId: "gebaeck" },
      index: 0,
    });

    expect(next[0].items).toHaveLength(1);
    expect(next[1].items.map((item) => item.id)).toEqual(["semmeln"]);
  });

  it("appends a restored item whose old position no longer exists", () => {
    // Other rows can leave during the undo window, so the remembered index may
    // now sit past the end of the list.
    const next = reduce(categories(), {
      type: "restore",
      item: { id: "birnen", name: "Birnen", isChecked: false, categoryId: "obst" },
      index: 7,
    });

    expect(next[0].items.map((item) => item.id)).toEqual(["apfel", "birnen"]);
  });

  it("leaves the list alone when the restored item is already back", () => {
    // useOptimistic replays the pending restore over the latest props, which
    // can already contain the row the undo write put back.
    const before = categories();

    const next = reduce(before, {
      type: "restore",
      item: { id: "apfel", name: "Äpfel", isChecked: false, categoryId: "obst" },
      index: 0,
    });

    expect(next).toEqual(before);
  });

  it("restores an item whose category is gone into the last category", () => {
    // The category can be removed while the undo window is open, which leaves
    // the remembered categoryId pointing at nothing.
    const next = reduce(categories(), {
      type: "restore",
      item: {
        id: "birnen",
        name: "Birnen",
        isChecked: false,
        categoryId: "geloescht",
      },
      index: 0,
    });

    expect(next[0].items.map((item) => item.id)).toEqual(["apfel"]);
    expect(next[1].items.map((item) => item.id)).toEqual(["birnen"]);
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
