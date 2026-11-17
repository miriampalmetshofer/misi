import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Quitt } from "./Quitt";
import { saveQuittEntry } from "./actions";

vi.mock("./actions", () => ({
  saveQuittEntry: vi.fn(),
  deleteQuittEntry: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
});

it("prefills a full settlement with the debtor, amount and date, preserving inputs on failure", async () => {
  vi.mocked(saveQuittEntry)
    .mockResolvedValueOnce({ error: "Speichern fehlgeschlagen" })
    .mockResolvedValueOnce({ error: null });
  const user = userEvent.setup();
  render(
    <Quitt
      today="2026-11-17"
      entries={[
        {
          id: "1",
          version: 1,
          kind: "expense",
          description: "Einkauf",
          amountCents: 4800,
          paidBy: "miriam",
          forWhom: "both",
          occurredOn: "2026-11-16",
        },
      ]}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Alles ausgleichen" }));
  const form = screen.getByRole("form", { name: "Rückzahlung eintragen" });
  expect(within(form).getByLabelText("Betrag (€)")).toHaveValue("24,00");
  expect(within(form).getByLabelText("Datum der Rückzahlung")).toHaveValue(
    "2026-11-17",
  );
  expect(within(form).getByRole("radio", { name: "Simon" })).toBeChecked();
  await user.click(within(form).getByRole("button", { name: "Speichern" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Speichern fehlgeschlagen",
  );
  expect(within(form).getByLabelText("Betrag (€)")).toHaveValue("24,00");
  const sent = vi.mocked(saveQuittEntry).mock.calls[0][0];
  expect(sent.get("paidBy")).toBe("simon");
  expect(sent.get("occurredOn")).toBe("2026-11-17");
  await user.click(within(form).getByRole("button", { name: "Speichern" }));
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
});

it("opens entries in a modal with an icon edit button and closes with Escape", async () => {
  const user = userEvent.setup();
  render(
    <Quitt
      today="2026-11-17"
      entries={[
        {
          id: "1",
          version: 1,
          kind: "expense",
          description: "Einkauf",
          amountCents: 4800,
          paidBy: "miriam",
          forWhom: "both",
          occurredOn: "2026-11-16",
        },
      ]}
    />,
  );
  const edit = screen.getByRole("button", { name: "Einkauf bearbeiten" });
  expect(edit).toHaveTextContent("");
  expect(edit.querySelector("svg")).not.toBeNull();
  await user.click(edit);
  const dialog = screen.getByRole("dialog", { name: "Eintrag bearbeiten" });
  expect(within(dialog).getByLabelText("Beschreibung")).toHaveValue("Einkauf");
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Ausgabe eintragen" }));
  expect(
    screen.getByRole("dialog", { name: "Ausgabe eintragen" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Schließen" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
