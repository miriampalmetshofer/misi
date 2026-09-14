import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FuelSplit } from "./FuelSplit";
import type { FuelFillUpEntry } from "./types";

/**
 * The server actions are the boundary of this layer: these tests assert which
 * action ran with which fields, not what the database did with them.
 *
 * The mocks stay *pending* by default, for the same reason the shopping list
 * ones do — `useOptimistic` drops its value once the transition settles and
 * re-renders from props, and props never change in a test.
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
    addFuelFillUp: action("add"),
    deleteFuelFillUp: action("delete"),
  };
});

vi.mock("./actions", () => ({
  addFuelFillUp: actions.addFuelFillUp,
  deleteFuelFillUp: actions.deleteFuelFillUp,
}));

const entry: FuelFillUpEntry = {
  id: "11111111-1111-1111-1111-111111111111",
  filledOn: "2025-11-04",
  miriamKm: 256.4,
  simonKm: 352.2,
  sharedKm: 273.8,
  carKm: 1052.4,
  paidAmount: 102,
  offsetMode: "proportional",
  miriamAmount: 45.46,
  simonAmount: 56.54,
};

async function fillSheetExample(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Miriam"), "256,4");
  await user.type(screen.getByLabelText("Simon"), "352,2");
  await user.type(screen.getByLabelText("Gemeinsam"), "273,8");
  await user.type(screen.getByLabelText("Auto"), "1052,4");
  await user.type(screen.getByLabelText("Betrag"), "102");
}

/** The save button, whose label changes while the write is in flight. */
function saveButton() {
  return screen.getByRole("button", { name: /Speichern|Wird gespeichert/ });
}

function history() {
  return within(screen.getByRole("region", { name: "Verlauf" }));
}

/**
 * The "Löschen" inside the confirmation dialog.
 *
 * Scoped to the dialog because every history row also has a "… löschen"
 * button, which is the one that opened it.
 */
function confirmDeleteButton() {
  return within(screen.getByRole("alertdialog")).getByRole("button", {
    name: "Löschen",
  });
}

/** The fields one `mutate` call sent, as a plain object. */
function sentFields(mock: ReturnType<typeof vi.fn>) {
  const formData = mock.mock.calls[0][0] as FormData;
  return Object.fromEntries(formData.entries());
}

beforeEach(() => {
  actions.pending.clear();
  actions.addFuelFillUp.mockClear();
  actions.deleteFuelFillUp.mockClear();
});

describe("FuelSplit persistence", () => {
  it("cannot save before there is a split to save", () => {
    render(<FuelSplit />);

    // An empty form has no amount and no kilometres — saving it would put a
    // 0,00 € row in a list of settled bills.
    expect(saveButton()).toBeDisabled();
  });

  it("stays unsaveable when the kilometres are there but the amount is not", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await user.type(screen.getByLabelText("Miriam"), "100");
    await user.type(screen.getByLabelText("Simon"), "100");

    // The split is computable — it is 50/50 of nothing — but a fill-up nobody
    // paid for is not a fill-up.
    expect(screen.queryByText(/Kilometer eintragen/)).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("refuses to save input it could not read", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await user.type(screen.getByLabelText("Miriam"), "hundert");
    await user.type(screen.getByLabelText("Simon"), "100");
    await user.type(screen.getByLabelText("Betrag"), "50");

    expect(saveButton()).toBeDisabled();
  });

  it("sends the fill-up in the notation the action re-parses", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await fillSheetExample(user);
    await user.click(saveButton());

    expect(actions.addFuelFillUp).toHaveBeenCalledTimes(1);
    // Commas, not JS dots: the action parses these with the same parseNumber
    // the form uses, so a "256.4" would come back as unreadable.
    expect(sentFields(actions.addFuelFillUp)).toMatchObject({
      miriamKm: "256,4",
      simonKm: "352,2",
      sharedKm: "273,8",
      carKm: "1052,4",
      paidAmount: "102",
      offsetMode: "proportional",
    });
  });

  it("sends the 50/50 mode when that is the one on screen", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await fillSheetExample(user);
    await user.click(
      screen.getByRole("checkbox", { name: "50/50-Modus verwenden" }),
    );
    await user.click(saveButton());

    expect(sentFields(actions.addFuelFillUp)).toMatchObject({
      offsetMode: "shared",
    });
  });

  it("waits for the insert instead of showing the fill-up straight away", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await fillSheetExample(user);
    await user.click(saveButton());

    // A fill-up is entered once and considered, so it is worth waiting for the
    // write rather than showing a row that might not be there.
    expect(history().queryByText("102,00 €")).not.toBeInTheDocument();
    expect(saveButton()).toHaveTextContent("Wird gespeichert …");
    expect(saveButton()).toBeDisabled();
  });

  it("keeps the numbers on screen while the write is in flight", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await fillSheetExample(user);
    await user.click(saveButton());

    // Not cleared yet: if the insert fails, these are the only copy of what
    // was typed at the pump.
    expect(screen.getByLabelText("Miriam")).toHaveValue("256,4");
    expect(screen.getByLabelText("Betrag")).toHaveValue("102");
  });

  it("empties the form once the fill-up is stored", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await fillSheetExample(user);
    await user.click(saveButton());

    await act(async () => {
      actions.pending.get("add")?.();
    });

    // The next fill-up starts clean rather than from numbers already settled.
    expect(screen.getByLabelText("Miriam")).toHaveValue("");
    expect(screen.getByLabelText("Betrag")).toHaveValue("");
    expect(saveButton()).toBeDisabled();
  });

  it("lists a stored fill-up with its date and both shares", () => {
    render(<FuelSplit fillUps={[entry]} />);

    expect(history().getByText("04.11.2025")).toBeInTheDocument();
    expect(history().getByText("102,00 €")).toBeInTheDocument();
    expect(
      history().getByText("Miriam 45,46 € · Simon 56,54 €"),
    ).toBeInTheDocument();
  });

  it("says so when nothing has been saved yet", () => {
    render(<FuelSplit />);

    expect(
      history().getByText("Noch keine Tankfüllungen gespeichert."),
    ).toBeInTheDocument();
  });

  it("deletes a stored fill-up by its id", async () => {
    const user = userEvent.setup();
    render(<FuelSplit fillUps={[entry]} />);

    await user.click(
      screen.getByRole("button", {
        name: "Tankfüllung vom 04.11.2025 löschen",
      }),
    );
    await user.click(confirmDeleteButton());

    expect(sentFields(actions.deleteFuelFillUp)).toMatchObject({
      id: entry.id,
    });
    // Still on screen behind the dialog: the row goes when the server drops it
    // from the page's props, not when the dialog is confirmed. (The open modal
    // makes the history inert, so it is queried through the document.)
    expect(screen.getByText("102,00 €")).toBeInTheDocument();
  });

  it("says the fill-up is being deleted while the delete is in flight", async () => {
    const user = userEvent.setup();
    render(<FuelSplit fillUps={[entry]} />);

    await user.click(
      screen.getByRole("button", {
        name: "Tankfüllung vom 04.11.2025 löschen",
      }),
    );
    await user.click(confirmDeleteButton());

    // The confirmation stays up and says so, rather than closing onto a row
    // that is still there.
    const dialog = within(screen.getByRole("alertdialog"));
    // Busy rather than disabled, so the label keeps full contrast while the
    // delete runs; the click is guarded in the handler.
    expect(
      dialog.getByRole("button", { name: /Wird gelöscht/ }),
    ).toHaveAttribute("aria-busy", "true");
    expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeDisabled();
  });
});

describe("history pagination", () => {
  /** `count` fill-ups, newest first, each with its own date and amount. */
  function manyFillUps(count: number): FuelFillUpEntry[] {
    return Array.from({ length: count }, (_, index) => ({
      ...entry,
      id: `id-${index}`,
      // Counts down from the 28th so the first row is the newest, the order
      // the query returns.
      filledOn: `2026-01-${String(28 - index).padStart(2, "0")}`,
      paidAmount: 100 + index,
    }));
  }

  it("shows only the first page and pages on to the rest", async () => {
    const user = userEvent.setup();
    render(<FuelSplit fillUps={manyFillUps(24)} />);

    expect(history().getByText("100,00 €")).toBeInTheDocument();
    expect(history().queryByText("110,00 €")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Seite 2" }));

    expect(history().getByText("110,00 €")).toBeInTheDocument();
    expect(history().queryByText("100,00 €")).not.toBeInTheDocument();
  });

  it("leaves the control off while everything fits on one page", () => {
    render(<FuelSplit fillUps={manyFillUps(10)} />);

    expect(
      screen.queryByRole("button", { name: "Seite 2" }),
    ).not.toBeInTheDocument();
  });

  it("falls back a page once the last row on it is gone", () => {
    // Eleven rows: page 2 holds exactly one, so losing it empties the page.
    const { rerender } = render(<FuelSplit fillUps={manyFillUps(11)} />);

    // Re-rendered with ten rows, the way the server sends them back after a
    // delete — page 2 no longer exists.
    rerender(<FuelSplit fillUps={manyFillUps(10)} />);

    expect(history().getByText("100,00 €")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Seite 2" }),
    ).not.toBeInTheDocument();
  });
});

describe("history details", () => {
  /** The summary line of the one stored fill-up, which toggles its details. */
  function summaryToggle() {
    return history().getByRole("button", { expanded: false });
  }

  it("keeps the recorded readings out of the way until asked for", () => {
    render(<FuelSplit fillUps={[entry]} />);

    // The history is a list to scan, so a row shows what was settled and not
    // the six numbers behind it.
    expect(history().queryByText("256,4 km")).not.toBeInTheDocument();
    expect(summaryToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("shows every recorded reading when a row is opened", async () => {
    const user = userEvent.setup();
    render(<FuelSplit fillUps={[entry]} />);

    await user.click(summaryToggle());

    const details = history();
    expect(details.getByText("256,4 km")).toBeInTheDocument();
    expect(details.getByText("352,2 km")).toBeInTheDocument();
    expect(details.getByText("273,8 km")).toBeInTheDocument();
    expect(details.getByText("1.052,4 km")).toBeInTheDocument();
    // 1052,4 - 882,4: the kilometres the device never saw.
    expect(details.getByText("170,0 km")).toBeInTheDocument();
    expect(details.getByText("Proportional")).toBeInTheDocument();
  });

  it("closes the row again on a second tap", async () => {
    const user = userEvent.setup();
    render(<FuelSplit fillUps={[entry]} />);

    await user.click(summaryToggle());
    await user.click(history().getByRole("button", { expanded: true }));

    expect(history().queryByText("256,4 km")).not.toBeInTheDocument();
  });

  it("names the mode a 50/50 fill-up was settled under", async () => {
    const user = userEvent.setup();
    render(<FuelSplit fillUps={[{ ...entry, offsetMode: "shared" }]} />);

    await user.click(summaryToggle());

    // Which mode produced the stored amounts is the one thing the euro figures
    // cannot be re-derived from, so the row has to say it.
    expect(history().getByText("50/50")).toBeInTheDocument();
  });

  it("leaves off shares that would not match the kilometres beside them", async () => {
    const user = userEvent.setup();
    render(<FuelSplit fillUps={[{ ...entry, offsetMode: "shared" }]} />);

    await user.click(summaryToggle());

    // 50/50 folds the unrecorded kilometres into the shared share, so a "31,0
    // %" next to "273,8 km" would be a percentage of a bigger distance than
    // the number it sits beside. Better no share than a wrong one.
    expect(history().getByText("273,8 km")).toBeInTheDocument();
    expect(history().queryByText("31,0 %")).not.toBeInTheDocument();
    expect(history().queryByText("29,1 %")).not.toBeInTheDocument();
    expect(history().queryByText("39,9 %")).not.toBeInTheDocument();
    // "Nicht erfasst" keeps its share: it is measured against the car reading,
    // which is exactly the distance it is a part of.
    expect(history().getByText("16,2 %")).toBeInTheDocument();
  });

  it("opens one row without opening its neighbours", async () => {
    const user = userEvent.setup();
    const other = { ...entry, id: "other", filledOn: "2025-10-02", carKm: 900 };
    render(<FuelSplit fillUps={[entry, other]} />);

    await user.click(
      history().getAllByRole("button", { expanded: false })[0],
    );

    expect(history().getByText("1.052,4 km")).toBeInTheDocument();
    expect(history().queryByText("900,0 km")).not.toBeInTheDocument();
  });

  it("leaves the delete button working while the row is open", async () => {
    const user = userEvent.setup();
    render(<FuelSplit fillUps={[entry]} />);

    await user.click(summaryToggle());
    // The toggle wraps the summary only, so this click must delete rather than
    // collapse the row it sits in.
    await user.click(
      screen.getByRole("button", {
        name: "Tankfüllung vom 04.11.2025 löschen",
      }),
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});

describe("delete confirmation", () => {
  it("keeps the fill-up when the dialog is cancelled", async () => {
    const user = userEvent.setup();
    render(<FuelSplit fillUps={[entry]} />);

    await user.click(
      screen.getByRole("button", {
        name: "Tankfüllung vom 04.11.2025 löschen",
      }),
    );
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Abbrechen",
      }),
    );

    expect(actions.deleteFuelFillUp).not.toHaveBeenCalled();
    expect(history().getByText("102,00 €")).toBeInTheDocument();
  });

  it("names the fill-up it is about to delete", async () => {
    const user = userEvent.setup();
    render(<FuelSplit fillUps={[entry]} />);

    await user.click(
      screen.getByRole("button", {
        name: "Tankfüllung vom 04.11.2025 löschen",
      }),
    );

    const dialog = within(screen.getByRole("alertdialog"));
    expect(dialog.getByText(/04\.11\.2025/)).toBeInTheDocument();
    expect(dialog.getByText(/102,00/)).toBeInTheDocument();
  });
});
