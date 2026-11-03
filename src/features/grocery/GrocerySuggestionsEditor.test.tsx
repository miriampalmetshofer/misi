import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GrocerySuggestionsEditor } from "./GrocerySuggestionsEditor";

const save = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({ saveGrocerySuggestions: save }));

beforeEach(() => save.mockReset());

function setup() {
  const onClose = vi.fn();
  render(<GrocerySuggestionsEditor categoryId="obst" suggestions={["Bananen", "Äpfel"]} onClose={onClose} />);
  return { user: userEvent.setup(), onClose };
}

describe("suggestion editor", () => {
  it("saves edits with the original list and closes after success", async () => {
    save.mockResolvedValue({ success: true });
    const { user, onClose } = setup();
    expect(screen.getByRole("textbox")).toHaveValue("Bananen\nÄpfel");
    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), "Birnen\nMango");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(Object.fromEntries(save.mock.calls[0][0])).toEqual({
      categoryId: "obst", suggestions: "Birnen\nMango", original: '["Bananen","Äpfel"]',
    });
  });

  it("cancels without saving", async () => {
    const { user, onClose } = setup();
    await user.clear(screen.getByRole("textbox"));
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(save).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps edits available after a conflicting save", async () => {
    save.mockResolvedValue({ error: "Die Vorschläge wurden inzwischen geändert." });
    const { user, onClose } = setup();
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByRole("textbox")).toHaveValue("Bananen\nÄpfel");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Speichern" })).toBeEnabled();
  });
});
