import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GroceryQuickEntry } from "./GroceryQuickEntry";
import { UNCATEGORIZED_ID } from "./categories";

function setup(preferences: Record<string, string> = {}) {
  const onAdd = vi.fn();
  render(<GroceryQuickEntry
    categories={[
      { id: "veg", name: "Gemüse", icon: "🥦", items: [] },
      { id: "other", name: "Sonstiges", icon: "📦", items: [] },
    ]}
    categoryPreferences={preferences}
    onAdd={onAdd}
  />);
  return {
    user: userEvent.setup(), onAdd,
    input: screen.getByRole("textbox"),
    select: screen.getByRole("combobox"),
  };
}

describe("grocery quick entry", () => {
  it("adds an unknown item without a category and keeps focus ready for the next", async () => {
    const { user, onAdd, input, select } = setup();
    await user.type(input, "Tomate{Enter}");
    expect(onAdd).toHaveBeenCalledWith("Tomate", null, false);
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(select).toHaveValue(UNCATEGORIZED_ID);
  });

  it("visibly matches remembered names regardless of capitalization and whitespace", async () => {
    const { user, onAdd, input, select } = setup({ "rote tomate": "veg" });
    await user.type(input, "  ROTE   Tomate  ");
    expect(select).toHaveValue("veg");
    await user.keyboard("{Enter}");
    expect(onAdd).toHaveBeenCalledWith("ROTE   Tomate", "veg", false);
  });

  it("remembers an explicit choice and resets it before the next item", async () => {
    const { user, onAdd, input, select } = setup();
    await user.type(input, "Tomate");
    await user.selectOptions(select, "veg");
    await user.click(screen.getByRole("button", { name: "Artikel zur Liste hinzufügen" }));
    expect(onAdd).toHaveBeenCalledWith("Tomate", "veg", true);
    await user.type(input, "Seife");
    expect(select).toHaveValue(UNCATEGORIZED_ID);
  });

  it("lets an explicit selection override memory, including leaving an item uncategorized", async () => {
    const { user, onAdd, input, select } = setup({ tomate: "veg" });
    await user.type(input, "Tomate");
    await user.selectOptions(select, "other");
    await user.click(screen.getByRole("button"));
    expect(onAdd).toHaveBeenLastCalledWith("Tomate", "other", true);
    await user.type(input, "Tomate");
    await user.selectOptions(select, UNCATEGORIZED_ID);
    await user.click(screen.getByRole("button"));
    expect(onAdd).toHaveBeenLastCalledWith("Tomate", null, false);
  });

  it("keeps a deliberate category selection while completing the item name", async () => {
    const { user, onAdd, input, select } = setup();
    await user.type(input, "Tom");
    await user.selectOptions(select, "veg");
    await user.type(input, "ate{Enter}");
    expect(onAdd).toHaveBeenCalledWith("Tomate", "veg", true);
  });

  it("ignores deleted category preferences and refuses empty names", async () => {
    const { user, onAdd, input, select } = setup({ tomate: "deleted" });
    await user.type(input, "Tomate");
    expect(select).toHaveValue(UNCATEGORIZED_ID);
    await user.clear(input);
    await user.type(input, "   {Enter}");
    expect(onAdd).not.toHaveBeenCalled();
  });
});
