import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The server actions are the boundary of this layer: the tests assert which
 * action ran with which fields, not what the database did with them.
 *
 * The mocks stay *pending* by default. That is not a trick to make assertions
 * pass — it is the state the optimistic UI actually lives in. `useOptimistic`
 * drops its value once the transition settles and re-renders from props, and in
 * a test the props never change (no server round-trip), so a resolved action
 * would always snap the row back. Holding the action in flight is what the user
 * sees between tapping and the server answering.
 */
const actions = vi.hoisted(() => {
  const pending = new Map<string, () => void>();

  function action(name: string) {
    return vi.fn(
      () => new Promise<void>((resolve) => pending.set(name, resolve)),
    );
  }

  return {
    pending,
    addGroceryItem: action("add"),
    deleteGroceryItem: action("delete"),
    renameGroceryItem: action("rename"),
    setGroceryItemChecked: action("check"),
  };
});

vi.mock("./actions", () => ({
  addGroceryItem: actions.addGroceryItem,
  deleteGroceryItem: actions.deleteGroceryItem,
  renameGroceryItem: actions.renameGroceryItem,
  setGroceryItemChecked: actions.setGroceryItemChecked,
}));

import { ShoppingList } from "./ShoppingList";
import type { ShoppingListCategory } from "./types";

function categories(): ShoppingListCategory[] {
  return [
    {
      id: "obst",
      name: "Obst",
      icon: "🍎",
      items: [
        { id: "apfel", name: "Äpfel", isChecked: false, categoryId: "obst" },
      ],
    },
    { id: "gebaeck", name: "Gebäck", icon: "🥐", items: [] },
  ];
}

function renderList() {
  return {
    user: userEvent.setup(),
    ...render(<ShoppingList categories={categories()} />),
  };
}

/** The fields a mocked server action received, as a plain object. */
function fieldsOf(mock: { mock: { calls: unknown[][] } }) {
  return Object.fromEntries(mock.mock.calls[0][0] as FormData);
}

function fieldsOfCall(mock: { mock: { calls: unknown[][] } }, index: number) {
  return Object.fromEntries(mock.mock.calls[index][0] as FormData);
}

function section(name: string) {
  return screen
    .getByRole("heading", { name: new RegExp(name) })
    .closest("section")!;
}

function addButton(categoryName: string) {
  return within(section(categoryName)).getByRole("button", {
    name: "Eigener Artikel",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  actions.pending.clear();
});

describe("adding an item", () => {
  it("adds a suggested item with one click", async () => {
    const { user } = renderList();

    await user.click(
      within(section("Gebäck")).getByRole("button", {
        name: "Semmeln schnell hinzufügen",
      }),
    );

    await waitFor(() =>
      expect(actions.addGroceryItem).toHaveBeenCalledTimes(1),
    );
    expect(fieldsOf(actions.addGroceryItem)).toEqual({
      name: "Semmeln",
      categoryId: "gebaeck",
    });
    expect(
      await within(section("Gebäck")).findByText("Semmeln"),
    ).toBeInTheDocument();
  });

  it("hides suggested items that are already on the list", () => {
    renderList();

    expect(
      within(section("Obst")).queryByRole("button", {
        name: "Äpfel schnell hinzufügen",
      }),
    ).not.toBeInTheDocument();
  });

  it("saves an open draft before adding a suggested item", async () => {
    const { user } = renderList();

    await user.click(addButton("Gebäck"));
    await user.keyboard("Croissants");
    await user.click(
      within(section("Gebäck")).getByRole("button", {
        name: "Semmeln schnell hinzufügen",
      }),
    );

    await waitFor(() =>
      expect(actions.addGroceryItem).toHaveBeenCalledTimes(2),
    );
    expect(fieldsOfCall(actions.addGroceryItem, 0)).toEqual({
      name: "Croissants",
      categoryId: "gebaeck",
    });
    expect(fieldsOfCall(actions.addGroceryItem, 1)).toEqual({
      name: "Semmeln",
      categoryId: "gebaeck",
    });
  });

  it("saves a typed name and sends it to the server", async () => {
    const { user } = renderList();

    await user.click(addButton("Gebäck"));
    await user.keyboard("Semmeln{Enter}");

    await waitFor(() =>
      expect(actions.addGroceryItem).toHaveBeenCalledTimes(1),
    );
    expect(fieldsOf(actions.addGroceryItem)).toEqual({
      name: "Semmeln",
      categoryId: "gebaeck",
    });
  });

  it("shows the new item right away, under its own category", async () => {
    const { user } = renderList();

    await user.click(addButton("Gebäck"));
    await user.keyboard("Semmeln{Enter}");

    expect(
      await within(section("Gebäck")).findByText("Semmeln"),
    ).toBeInTheDocument();
  });

  it("trims surrounding whitespace from the name", async () => {
    const { user } = renderList();

    await user.click(addButton("Gebäck"));
    await user.keyboard("  Semmeln  {Enter}");

    await waitFor(() =>
      expect(actions.addGroceryItem).toHaveBeenCalledTimes(1),
    );
    expect(fieldsOf(actions.addGroceryItem).name).toBe("Semmeln");
  });

  it("discards an empty draft without calling the server", async () => {
    const { user } = renderList();

    await user.click(addButton("Gebäck"));
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(
        within(section("Gebäck")).queryByRole("textbox"),
      ).not.toBeInTheDocument(),
    );
    expect(actions.addGroceryItem).not.toHaveBeenCalled();
  });

  it("discards a draft on Escape, without touching the server", async () => {
    const { user } = renderList();

    await user.click(addButton("Gebäck"));
    await user.keyboard("Semmeln{Escape}");

    await waitFor(() =>
      expect(
        within(section("Gebäck")).queryByRole("textbox"),
      ).not.toBeInTheDocument(),
    );
    expect(actions.addGroceryItem).not.toHaveBeenCalled();
    // A draft never reached the database, so discarding it must stay local:
    // its client-made id would fail the uuid cast server-side.
    expect(actions.deleteGroceryItem).not.toHaveBeenCalled();
  });

  it("saves a typed draft when + is clicked instead of Enter", async () => {
    const { user } = renderList();

    await user.click(addButton("Gebäck"));
    await user.keyboard("Bananen");
    // No Enter: the save rides on the input's blur, which must beat the
    // re-render that replaces the draft row.
    await user.click(addButton("Gebäck"));

    await waitFor(() =>
      expect(actions.addGroceryItem).toHaveBeenCalledTimes(1),
    );
    expect(fieldsOf(actions.addGroceryItem)).toEqual({
      name: "Bananen",
      categoryId: "gebaeck",
    });
    expect(
      await within(section("Gebäck")).findByText("Bananen"),
    ).toBeInTheDocument();
    expect(within(section("Gebäck")).getByRole("textbox")).toHaveValue("");
  });

  it("keeps only one draft open at a time", async () => {
    const { user } = renderList();

    await user.click(addButton("Obst"));
    await user.click(addButton("Gebäck"));

    await waitFor(() => expect(screen.getAllByRole("textbox")).toHaveLength(1));
    expect(within(section("Gebäck")).getByRole("textbox")).toBeInTheDocument();
  });

  it("keeps an empty draft open when its add button is pressed again", async () => {
    const { user } = renderList();

    await user.click(addButton("Gebäck"));
    await user.click(addButton("Gebäck"));

    expect(within(section("Gebäck")).getByRole("textbox")).toHaveValue("");
    expect(actions.addGroceryItem).not.toHaveBeenCalled();
  });

  it("moves an empty draft when another category's add button is pressed", async () => {
    const { user } = renderList();

    await user.click(addButton("Gebäck"));
    await user.click(addButton("Obst"));

    expect(within(section("Gebäck")).queryByRole("textbox")).toBeNull();
    expect(within(section("Obst")).getByRole("textbox")).toHaveValue("");
    expect(actions.addGroceryItem).not.toHaveBeenCalled();
  });
});

describe("renaming an item", () => {
  it("opens an input on the item and saves the new name", async () => {
    const { user } = renderList();

    await user.click(screen.getByRole("button", { name: "Äpfel" }));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Grüne Äpfel{Enter}");

    await waitFor(() =>
      expect(actions.renameGroceryItem).toHaveBeenCalledTimes(1),
    );
    expect(fieldsOf(actions.renameGroceryItem)).toEqual({
      itemId: "apfel",
      name: "Grüne Äpfel",
    });
    expect(await screen.findByText("Grüne Äpfel")).toBeInTheDocument();
  });

  it("starts editing with the current name prefilled", async () => {
    const { user } = renderList();

    await user.click(screen.getByRole("button", { name: "Äpfel" }));

    expect(screen.getByRole("textbox")).toHaveValue("Äpfel");
  });

  it("reverts on Escape without calling the server", async () => {
    const { user } = renderList();

    await user.click(screen.getByRole("button", { name: "Äpfel" }));
    await user.type(screen.getByRole("textbox"), " kaputt{Escape}");

    expect(await screen.findByText("Äpfel")).toBeInTheDocument();
    expect(actions.renameGroceryItem).not.toHaveBeenCalled();
  });

  it("does not call the server when the name is unchanged", async () => {
    const { user } = renderList();

    await user.click(screen.getByRole("button", { name: "Äpfel" }));
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument(),
    );
    expect(actions.renameGroceryItem).not.toHaveBeenCalled();
  });

  it("ignores an emptied name and keeps the item", async () => {
    const { user } = renderList();

    await user.click(screen.getByRole("button", { name: "Äpfel" }));
    await user.clear(screen.getByRole("textbox"));
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Äpfel")).toBeInTheDocument();
    expect(actions.renameGroceryItem).not.toHaveBeenCalled();
  });
});

describe("deleting an item", () => {
  it("is hidden and unreachable until the row is being edited", async () => {
    const { user } = renderList();

    // Queried by label, not role: aria-hidden removes it from the a11y tree,
    // which is exactly the property under test.
    const hidden = screen.getByLabelText("Äpfel löschen");
    // Rendered for stable layout, but inert: not in the a11y tree, not tabbable.
    expect(hidden).toHaveAttribute("aria-hidden", "true");
    expect(hidden).toHaveAttribute("tabindex", "-1");

    await user.click(screen.getByRole("button", { name: "Äpfel" }));

    const visible = screen.getByRole("button", { name: /löschen/ });
    expect(visible).not.toHaveAttribute("aria-hidden", "true");
    expect(visible).not.toHaveAttribute("tabindex", "-1");
  });

  it("deletes the item the click landed on", async () => {
    const { user } = renderList();

    await user.click(screen.getByRole("button", { name: "Äpfel" }));
    await user.click(screen.getByRole("button", { name: /Äpfel löschen/ }));

    await waitFor(() =>
      expect(actions.deleteGroceryItem).toHaveBeenCalledTimes(1),
    );
    expect(fieldsOf(actions.deleteGroceryItem)).toEqual({ itemId: "apfel" });
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Äpfel" })).toBeNull(),
    );
  });

  it("deletes rather than renames when the input held an edit", async () => {
    const { user } = renderList();

    await user.click(screen.getByRole("button", { name: "Äpfel" }));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Birnen");

    // Clicking delete blurs the input, which would otherwise save the edit and
    // hide this button before the click could land.
    await user.click(screen.getByRole("button", { name: /löschen/ }));

    await waitFor(() =>
      expect(actions.deleteGroceryItem).toHaveBeenCalledTimes(1),
    );
    expect(actions.renameGroceryItem).not.toHaveBeenCalled();
  });
});

describe("checking an item off", () => {
  it("removes it from the list and tells the server", async () => {
    const { user } = renderList();

    await user.click(
      screen.getByRole("checkbox", { name: /Äpfel erledigt markieren/ }),
    );

    await waitFor(() =>
      expect(actions.setGroceryItemChecked).toHaveBeenCalledTimes(1),
    );
    expect(fieldsOf(actions.setGroceryItemChecked)).toEqual({
      itemId: "apfel",
      isChecked: "true",
    });
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Äpfel" })).toBeNull(),
    );
  });

  it("cannot be checked off while it is still being added", async () => {
    const { user } = renderList();

    await user.click(addButton("Gebäck"));
    await user.keyboard("Semmeln{Enter}");

    const row = (await within(section("Gebäck")).findByText("Semmeln")).closest(
      "li",
    )!;
    // Base UI renders the checkbox as a span, so being disabled shows up as
    // aria-disabled rather than the native disabled attribute. Click it to
    // prove that is not just cosmetic.
    const checkbox = within(row).getByRole("checkbox", {
      name: /erledigt markieren/,
    });
    expect(checkbox).toHaveAttribute("aria-disabled", "true");

    await user.click(checkbox);
    expect(actions.setGroceryItemChecked).not.toHaveBeenCalled();
  });
});
