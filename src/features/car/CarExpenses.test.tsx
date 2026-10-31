import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({
  saveCarExpense: vi.fn().mockResolvedValue({ error: null }),
  deleteCarExpense: vi.fn().mockResolvedValue({ error: null }),
}));
import { saveCarExpense, deleteCarExpense } from "./actions";
import { CarExpenses } from "./CarExpenses";

const entry = {
  id: "11111111-1111-1111-1111-111111111111",
  isSettled: false,
  spentOn: "2026-10-24",
  description: "Winterreifen",
  totalAmount: 480,
  miriamPercent: 40,
  miriamAmount: 192,
  simonAmount: 288,
  note: "Werkstatt",
};
beforeEach(() => vi.clearAllMocks());

it("complements either percentage and previews the exact euro amounts", async () => {
  const user = userEvent.setup();
  render(<CarExpenses entries={[]} />);
  await user.click(screen.getByRole("button", { name: "Eintrag hinzufügen" }));
  await user.type(screen.getByLabelText("Gesamtkosten"), "480");
  expect(screen.getByLabelText("Anteil Miriam")).toHaveValue("50");
  await user.clear(screen.getByLabelText("Anteil Simon"));
  await user.type(screen.getByLabelText("Anteil Simon"), "60");
  expect(screen.getByLabelText("Anteil Miriam")).toHaveValue("40");
  expect(screen.getByLabelText("Eurobetrag Miriam")).toHaveTextContent(
    "192,00",
  );
  expect(screen.getByLabelText("Eurobetrag Simon")).toHaveTextContent("288,00");
  await user.clear(screen.getByLabelText("Anteil Miriam"));
  await user.type(screen.getByLabelText("Anteil Miriam"), "33.33");
  expect(screen.getByLabelText("Anteil Simon")).toHaveValue("66,67");
  expect(screen.getByLabelText("Eurobetrag Miriam")).toHaveTextContent(
    "159,98",
  );
});

it("keeps invalid and incomplete input from becoming a saved expense", async () => {
  const user = userEvent.setup();
  render(<CarExpenses entries={[]} />);
  await user.click(screen.getByRole("button", { name: "Eintrag hinzufügen" }));
  await user.type(
    screen.getByLabelText("Was wurde gemacht oder gekauft?"),
    "Reifen",
  );
  await user.type(screen.getByLabelText("Gesamtkosten"), "480");
  expect(screen.getByRole("button", { name: "Speichern" })).toBeEnabled();
  await user.clear(screen.getByLabelText("Anteil Miriam"));
  expect(screen.getByLabelText("Eurobetrag Miriam")).toHaveTextContent("—");
  expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
});

it.each([33.33, 66.67, 99.99])(
  "reopens a decimal share of %s percent without rounding artifacts",
  async (miriamPercent) => {
    const user = userEvent.setup();
    render(<CarExpenses entries={[{ ...entry, miriamPercent }]} />);
    await user.click(screen.getByRole("button", { expanded: false }));
    await user.click(
      screen.getByRole("button", { name: "Winterreifen bearbeiten" }),
    );
    expect(screen.getByRole("button", { name: "Speichern" })).toBeEnabled();
    expect(screen.getByLabelText("Eurobetrag Miriam")).not.toHaveTextContent(
      "—",
    );
  },
);

it("opens existing data for editing and preserves it when saving fails", async () => {
  const user = userEvent.setup();
  vi.mocked(saveCarExpense).mockResolvedValueOnce({
    error: "Speichern fehlgeschlagen",
  });
  render(<CarExpenses entries={[entry]} />);
  await user.click(screen.getByRole("button", { expanded: false }));
  await user.click(
    screen.getByRole("button", { name: "Winterreifen bearbeiten" }),
  );
  expect(screen.getByLabelText("Datum")).toHaveValue("2026-10-24");
  expect(screen.getByLabelText("Gesamtkosten")).toHaveValue("480");
  expect(screen.getByLabelText("Anteil Simon")).toHaveValue("60");
  await user.clear(screen.getByLabelText("Gesamtkosten"));
  await user.type(screen.getByLabelText("Gesamtkosten"), "500");
  await user.click(screen.getByRole("button", { name: "Speichern" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Speichern fehlgeschlagen",
  );
  expect(screen.getByLabelText("Gesamtkosten")).toHaveValue("500");
  const data = vi.mocked(saveCarExpense).mock.calls[0][0];
  expect(data.get("id")).toBe(entry.id);
  expect(data.get("totalAmount")).toBe("500");
  await user.click(screen.getByRole("button", { name: "Speichern" }));
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
});

it("requires confirmation before deleting and supports cancellation", async () => {
  const user = userEvent.setup();
  render(<CarExpenses entries={[entry]} />);
  await user.click(screen.getByRole("button", { expanded: false }));
  await user.click(
    screen.getByRole("button", { name: "Winterreifen bearbeiten" }),
  );
  await user.click(screen.getByRole("button", { name: "Löschen" }));
  expect(deleteCarExpense).not.toHaveBeenCalled();
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Abbrechen",
    }),
  );
  expect(deleteCarExpense).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Löschen" }));
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Löschen",
    }),
  );
  expect(deleteCarExpense).toHaveBeenCalledWith(entry.id);
});
