import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GrocerySuggestionsEditor } from "./GrocerySuggestionsEditor";

const save = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({ saveGrocerySuggestions: save }));
beforeEach(() => { save.mockReset(); });

function setup(suggestions = ["Bananen", "Äpfel"]) {
  const onClose = vi.fn();
  render(<GrocerySuggestionsEditor categoryId="obst" categoryName="Obst" suggestions={suggestions} onClose={onClose} />);
  return { user: userEvent.setup(), onClose };
}

describe("suggestion editor", () => {
  it("renames, removes and adds individual suggestions before saving", async () => {
    save.mockResolvedValue({ success: true });
    const { user, onClose } = setup();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Vorschläge bearbeiten");
    await user.clear(screen.getByRole("textbox", { name: "Vorschlag 1" }));
    await user.type(screen.getByRole("textbox", { name: "Vorschlag 1" }), "Birnen");
    await user.click(screen.getByRole("button", { name: "Vorschlag 2 entfernen" }));
    await user.type(screen.getByRole("textbox", { name: "Neuer Vorschlag" }), "Mango");
    await user.click(screen.getByRole("button", { name: "Vorschlag hinzufügen" }));
    expect(screen.getByRole("textbox", { name: "Vorschlag 2" })).toHaveValue("Mango");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(Object.fromEntries(save.mock.calls[0][0])).toEqual({
      categoryId: "obst", suggestions: "Birnen\nMango", original: '["Bananen","Äpfel"]',
    });
  });

  it("includes a new name when saving without first tapping plus", async () => {
    save.mockResolvedValue({ success: true });
    const { user } = setup([]);
    await user.type(screen.getByRole("textbox", { name: "Neuer Vorschlag" }), "Semmeln");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0].get("suggestions")).toBe("Semmeln");
  });

  it("adds on Enter without saving the dialog", async () => {
    const { user } = setup([]);
    await user.type(screen.getByRole("textbox", { name: "Neuer Vorschlag" }), "Mango{Enter}");
    expect(screen.getByRole("textbox", { name: "Vorschlag 1" })).toHaveValue("Mango");
    expect(save).not.toHaveBeenCalled();
  });

  it.each(["Abbrechen", "Schließen"])("discards changes via %s without saving", async (name) => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole("button", { name }));
    expect(save).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps edits available after a conflicting save", async () => {
    save.mockResolvedValue({ error: "Die Vorschläge wurden inzwischen geändert." });
    const { user, onClose } = setup();
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Vorschlag 1" })).toHaveValue("Bananen");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Speichern" })).toBeEnabled();
  });
});
