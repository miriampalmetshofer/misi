import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    moveGroceryItem: action("move"),
    renameGroceryItem: action("rename"),
    setGroceryItemChecked: action("check"),
  };
});

vi.mock("./actions", () => ({
  addGroceryItem: actions.addGroceryItem,
  deleteGroceryItem: actions.deleteGroceryItem,
  moveGroceryItem: actions.moveGroceryItem,
  renameGroceryItem: actions.renameGroceryItem,
  setGroceryItemChecked: actions.setGroceryItemChecked,
}));

import { ShoppingList } from "./ShoppingList";
import type { ShoppingListCategory } from "./types";

/**
 * happy-dom gives every element a zero-size rect, so the drag controller — which
 * measures the category sections once when the drag starts — would see nothing to
 * aim at. Lay the sections out as 100px bands with a 20px gap, matching how they
 * really stack, so hit-testing has real geometry to work against.
 */
function layOutSections() {
  screen.getAllByRole("region", { hidden: true });
  const sections = [...document.querySelectorAll("[data-category-id]")];

  sections.forEach((element, index) => {
    const top = index * 120;
    element.getBoundingClientRect = () =>
      ({ top, bottom: top + 100, left: 0, right: 400, width: 400, height: 100,
         x: 0, y: top, toJSON: () => {} }) as DOMRect;
  });
}

/** Vertical midpoint of a laid-out section, for aiming a drop. */
function midpointOf(name: string) {
  return section(name).getBoundingClientRect().top + 50;
}

function categories(): ShoppingListCategory[] {
  return [
    {
      id: "obst",
      name: "Obst",
      icon: "🍎",
      items: [
        { id: "apfel", name: "Äpfel", isChecked: false, categoryId: "obst" },
        {
          id: "bananen",
          name: "Bananen",
          isChecked: false,
          categoryId: "obst",
        },
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

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("adding an item", () => {
  it("adds a suggested item with one click", async () => {
    const { user } = renderList();

    await user.click(
      within(section("Obst")).getByRole("button", {
        name: "Nektarinen schnell hinzufügen",
      }),
    );

    await waitFor(() =>
      expect(actions.addGroceryItem).toHaveBeenCalledTimes(1),
    );
    expect(fieldsOf(actions.addGroceryItem)).toEqual({
      name: "Nektarinen",
      categoryId: "obst",
    });
    expect(
      await within(section("Obst")).findByText("Nektarinen"),
    ).toBeInTheDocument();
  });

  it("hides suggested items that are already on the list", () => {
    renderList();

    expect(
      within(section("Obst")).queryByRole("button", {
        name: "Bananen schnell hinzufügen",
      }),
    ).not.toBeInTheDocument();
  });

  it("saves an open draft before adding a suggested item", async () => {
    const { user } = renderList();

    await user.click(addButton("Obst"));
    await user.keyboard("Mangos");
    await user.click(
      within(section("Obst")).getByRole("button", {
        name: "Nektarinen schnell hinzufügen",
      }),
    );

    await waitFor(() =>
      expect(actions.addGroceryItem).toHaveBeenCalledTimes(2),
    );
    expect(fieldsOfCall(actions.addGroceryItem, 0)).toEqual({
      name: "Mangos",
      categoryId: "obst",
    });
    expect(fieldsOfCall(actions.addGroceryItem, 1)).toEqual({
      name: "Nektarinen",
      categoryId: "obst",
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

describe("the open-item total", () => {
  it("counts the items still to buy", () => {
    renderList();

    expect(screen.getByText("2 Artikel offen")).toBeInTheDocument();
  });

  it("drops as items are checked off", async () => {
    const { user } = renderList();

    await user.click(
      screen.getByRole("checkbox", { name: /Äpfel erledigt markieren/ }),
    );

    expect(await screen.findByText("1 Artikel offen")).toBeInTheDocument();
  });

  it("says so when nothing is left", () => {
    render(<ShoppingList categories={[]} />);

    expect(screen.getByText("Nichts offen")).toBeInTheDocument();
  });

  it("ignores a draft that has no name yet", async () => {
    const { user } = renderList();

    await user.click(addButton("Gebäck"));

    expect(screen.getByText("2 Artikel offen")).toBeInTheDocument();
  });
});

describe("moving an item between categories", () => {
  /** Press the row, wait out the hold, and report whether the drag engaged. */
  function longPress(row: HTMLElement, at = { x: 12, y: 12 }) {
    fireEvent.pointerDown(row, {
      button: 0,
      clientX: at.x,
      clientY: at.y,
      pointerId: 1,
    });
    act(() => vi.advanceTimersByTime(450));
  }

  it("keeps a normal item click as edit, not drag", () => {
    vi.useFakeTimers();
    renderList();

    const editButton = screen.getByRole("button", { name: "Äpfel" });
    const row = editButton.closest("li")!;

    fireEvent.pointerDown(row, {
      button: 0,
      clientX: 12,
      clientY: 12,
      pointerId: 1,
    });
    act(() => vi.advanceTimersByTime(120));
    fireEvent.pointerUp(row, { clientX: 12, clientY: 12, pointerId: 1 });
    fireEvent.click(editButton);

    expect(row).not.toHaveAttribute("data-dragging", "true");
    expect(screen.getByRole("textbox")).toHaveValue("Äpfel");
    expect(actions.moveGroceryItem).not.toHaveBeenCalled();
  });

  it("long-presses a saved item, highlights the target and persists the move", async () => {
    vi.useFakeTimers();
    renderList();
    layOutSections();

    const row = screen.getByRole("button", { name: "Äpfel" }).closest("li")!;
    longPress(row);

    expect(row).toHaveAttribute("data-dragging", "true");

    const targetY = midpointOf("Gebäck");
    fireEvent.pointerMove(row, { clientX: 16, clientY: targetY, pointerId: 1 });

    expect(section("Gebäck")).toHaveAttribute("data-drop-target", "true");

    fireEvent.pointerUp(row, { clientX: 16, clientY: targetY, pointerId: 1 });
    vi.useRealTimers();

    await waitFor(() =>
      expect(actions.moveGroceryItem).toHaveBeenCalledTimes(1),
    );
    expect(fieldsOf(actions.moveGroceryItem)).toEqual({
      itemId: "apfel",
      categoryId: "gebaeck",
    });
    expect(
      await within(section("Gebäck")).findByText("Äpfel"),
    ).toBeInTheDocument();
  });

  // The reported bug: holding a finger still is not something people actually
  // do, and the old 8px threshold meant ordinary drift cancelled the drag.
  it("still starts the drag when the finger drifts during the hold", () => {
    vi.useFakeTimers();
    renderList();
    layOutSections();

    const row = screen.getByRole("button", { name: "Äpfel" }).closest("li")!;

    fireEvent.pointerDown(row, {
      button: 0,
      clientX: 12,
      clientY: 12,
      pointerId: 1,
    });

    // ~8px of wobble in each direction, spread across the hold window
    for (let step = 1; step <= 8; step += 1) {
      act(() => vi.advanceTimersByTime(40));
      fireEvent.pointerMove(row, {
        clientX: 12 + step,
        clientY: 12 + (step % 2),
        pointerId: 1,
      });
    }
    act(() => vi.advanceTimersByTime(450));

    expect(row).toHaveAttribute("data-dragging", "true");
  });

  it("keeps normal scrolling from starting a drag", () => {
    vi.useFakeTimers();
    renderList();
    layOutSections();

    const row = screen.getByRole("button", { name: "Äpfel" }).closest("li")!;

    fireEvent.pointerDown(row, {
      button: 0,
      clientX: 12,
      clientY: 12,
      pointerId: 1,
    });
    // Clearly vertical: the page is being scrolled, not the row picked up.
    fireEvent.pointerMove(row, { clientX: 12, clientY: 60, pointerId: 1 });
    act(() => vi.advanceTimersByTime(450));

    expect(row).not.toHaveAttribute("data-dragging", "true");
    expect(actions.moveGroceryItem).not.toHaveBeenCalled();
  });

  it("does nothing when the item is dropped outside every category", () => {
    vi.useFakeTimers();
    renderList();
    layOutSections();

    const row = screen.getByRole("button", { name: "Äpfel" }).closest("li")!;
    longPress(row);
    fireEvent.pointerUp(row, { clientX: 16, clientY: 5000, pointerId: 1 });
    vi.useRealTimers();

    expect(actions.moveGroceryItem).not.toHaveBeenCalled();
  });

  it("does nothing when the item is dropped back on its own category", () => {
    vi.useFakeTimers();
    renderList();
    layOutSections();

    const row = screen.getByRole("button", { name: "Äpfel" }).closest("li")!;
    longPress(row);
    const ownY = midpointOf("Obst");
    fireEvent.pointerUp(row, { clientX: 16, clientY: ownY, pointerId: 1 });
    vi.useRealTimers();

    expect(actions.moveGroceryItem).not.toHaveBeenCalled();
  });

  it("abandons the drag on pointercancel without moving anything", () => {
    vi.useFakeTimers();
    renderList();
    layOutSections();

    const row = screen.getByRole("button", { name: "Äpfel" }).closest("li")!;
    longPress(row);
    expect(row).toHaveAttribute("data-dragging", "true");

    fireEvent.pointerCancel(row, { pointerId: 1 });
    vi.useRealTimers();

    expect(row).not.toHaveAttribute("data-dragging", "true");
    expect(actions.moveGroceryItem).not.toHaveBeenCalled();
  });

  // A second finger tapping the lifted row must not commit the drop: its
  // clientY has nothing to do with where the dragging finger is aiming.
  it("ignores a second finger lifting during the drag", () => {
    vi.useFakeTimers();
    renderList();
    layOutSections();

    const row = screen.getByRole("button", { name: "Äpfel" }).closest("li")!;
    longPress(row);

    fireEvent.pointerUp(row, {
      clientX: 16,
      clientY: midpointOf("Gebäck"),
      pointerId: 2,
    });
    vi.useRealTimers();

    expect(row).toHaveAttribute("data-dragging", "true");
    expect(actions.moveGroceryItem).not.toHaveBeenCalled();
  });

  // iOS cancels unrelated touches routinely when it takes over a gesture;
  // that must not silently drop the drag the user is still performing.
  it("ignores a pointercancel for a different pointer", () => {
    vi.useFakeTimers();
    renderList();
    layOutSections();

    const row = screen.getByRole("button", { name: "Äpfel" }).closest("li")!;
    longPress(row);

    fireEvent.pointerCancel(row, { pointerId: 2 });
    vi.useRealTimers();

    expect(row).toHaveAttribute("data-dragging", "true");
  });

  // The drag origin is the point the row is positioned against, so drift
  // during the hold has to move it too or the row snaps sideways on pickup.
  it("does not jump sideways when the finger drifted during the hold", () => {
    vi.useFakeTimers();
    renderList();
    layOutSections();

    // The row is positioned inside a frame; paint synchronously so the
    // transform is readable straight after the move.
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    const row = screen.getByRole("button", { name: "Äpfel" }).closest("li")!;

    fireEvent.pointerDown(row, {
      button: 0,
      clientX: 12,
      clientY: 12,
      pointerId: 1,
    });
    // Drift well past the slop radius, horizontally so the hold survives.
    fireEvent.pointerMove(row, { clientX: 42, clientY: 14, pointerId: 1 });
    act(() => vi.advanceTimersByTime(450));

    expect(row).toHaveAttribute("data-dragging", "true");

    // Holding still after the lift must leave the row where it was picked up.
    fireEvent.pointerMove(row, { clientX: 42, clientY: 14, pointerId: 1 });
    vi.useRealTimers();
    vi.unstubAllGlobals();

    expect(row.style.transform).toBe("translate3d(0px, 0px, 0)");
  });

  // setPointerCapture throws NotFoundError when the browser has already dropped
  // the pointer. That surfaced as a runtime error overlay mid-drag.
  it("survives the browser refusing pointer capture", () => {
    vi.useFakeTimers();
    renderList();
    layOutSections();

    const row = screen.getByRole("button", { name: "Äpfel" }).closest("li")!;
    row.setPointerCapture = () => {
      throw new DOMException("No active pointer", "NotFoundError");
    };

    expect(() => longPress(row)).not.toThrow();
    expect(row).toHaveAttribute("data-dragging", "true");
  });


  // A drop that produces no click leaves the click-suppressing flag armed.
  // It must not then swallow the next real tap on the row.
  it("still opens the editor on the tap after a drop that had no click", () => {
    vi.useFakeTimers();
    renderList();
    layOutSections();

    const row = screen.getByRole("button", { name: "Äpfel" }).closest("li")!;
    longPress(row);
    // Dropped back on its own category: a no-op move, and no click follows.
    fireEvent.pointerUp(row, {
      clientX: 16,
      clientY: midpointOf("Obst"),
      pointerId: 1,
    });
    vi.useRealTimers();

    fireEvent.pointerDown(row, {
      button: 0,
      clientX: 12,
      clientY: 12,
      pointerId: 1,
    });
    fireEvent.pointerUp(row, { clientX: 12, clientY: 12, pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Äpfel" }));

    expect(screen.getByRole("textbox")).toHaveValue("Äpfel");
  });

  // iOS begins selecting text during the long press itself and shows its
  // selection handles over the row, so selection has to be off before a drag
  // exists to react to.
  it("keeps a draggable row unselectable so iOS does not select its text", () => {
    renderList();

    const row = screen.getByRole("button", { name: "Äpfel" }).closest("li")!;

    expect(row).toHaveAttribute("data-draggable", "true");
    expect(row.className).toContain("select-none");
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
