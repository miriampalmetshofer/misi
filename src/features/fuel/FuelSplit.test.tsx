import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FuelSplit } from "./FuelSplit";

async function fillSheetExample(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Miriam"), "256,4");
  await user.type(screen.getByLabelText("Simon"), "352,2");
  await user.type(screen.getByLabelText("Beide"), "273,8");
  await user.type(screen.getByLabelText("Gesamt"), "1052,4");
  await user.type(screen.getByLabelText("Betrag"), "102");
}

function result() {
  return within(screen.getByRole("region", { name: "Zu zahlen" }));
}

describe("FuelSplit", () => {
  it("prefills the date with today but leaves it editable", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    const datum = screen.getByLabelText("Datum") as HTMLInputElement;
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    expect(datum.value).toBe(expected);

    await user.clear(datum);
    await user.type(datum, "2025-12-12");
    expect(datum.value).toBe("2025-12-12");
  });

  it("prompts for kilometres before anything is entered", () => {
    render(<FuelSplit />);

    expect(
      screen.getByText(/Kilometer eintragen/),
    ).toBeInTheDocument();
  });

  it("splits the amount proportionally by default", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await fillSheetExample(user);

    expect(result().getByText("45,46 €")).toBeInTheDocument();
    expect(result().getByText("56,54 €")).toBeInTheDocument();
  });

  it("switches to the spreadsheet's 50/50 split on demand", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await fillSheetExample(user);
    await user.click(
      screen.getByRole("checkbox", { name: "50/50-Modus verwenden" }),
    );

    expect(result().getByText("46,36 €")).toBeInTheDocument();
    expect(result().getByText("55,64 €")).toBeInTheDocument();
  });

  it("shows each person's share of the bill, summing to 100 %", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    // Mostly-shared trip: the personal distance shares are 1,2 % and 4,5 %,
    // which next to 58,02 € and 61,98 € read as though the split were broken.
    await user.type(screen.getByLabelText("Miriam"), "15");
    await user.type(screen.getByLabelText("Simon"), "55");
    await user.type(screen.getByLabelText("Beide"), "1150");
    await user.type(screen.getByLabelText("Gesamt"), "1220");
    await user.type(screen.getByLabelText("Betrag"), "120");

    expect(result().getByText("48,4 %")).toBeInTheDocument();
    expect(result().getByText("51,6 %")).toBeInTheDocument();
    expect(result().queryByText("1,2 %")).not.toBeInTheDocument();
  });

  it("shows the device shortfall against the car reading", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await fillSheetExample(user);

    expect(screen.getByText("882,4 km")).toBeInTheDocument();
    expect(screen.getByText("170,0 km (16,2 %)")).toBeInTheDocument();
  });

  it("turns a typed period into the comma it accepts", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    const miriam = screen.getByLabelText("Miriam");
    await user.type(miriam, "100.5");
    await user.type(screen.getByLabelText("Simon"), "100.5");
    await user.type(screen.getByLabelText("Betrag"), "50");

    // Phone keypads offer whichever separator they like, so a dot has to work.
    // It is rewritten in place rather than accepted quietly, so the field shows
    // the separator the app actually uses.
    expect(miriam).toHaveValue("100,5");
    expect(result().getAllByText("25,00 €")).toHaveLength(2);
  });

  it("keeps the result list a valid dt/dd structure", async () => {
    const user = userEvent.setup();
    const { container } = render(<FuelSplit />);

    await fillSheetExample(user);

    // axe flags a <dl> holding anything other than dt/dd groups, so the
    // explanatory note must not be a direct child of the list.
    for (const list of container.querySelectorAll("dl")) {
      for (const child of list.children) {
        expect(["DIV", "DT", "DD"]).toContain(child.tagName);
      }
    }
  });

  it("rejects a second separator rather than guessing at it", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    // "1.256,4" normalises to "1,256,4". There is no grouping separator, so
    // this is not a number at all — saying so beats picking a reading.
    await user.type(screen.getByLabelText("Miriam"), "1.256,4");
    await user.type(screen.getByLabelText("Simon"), "100");
    await user.type(screen.getByLabelText("Betrag"), "50");

    expect(screen.getByText(/nur Zahlen eintragen/)).toBeInTheDocument();
  });

  it("does not show a summary computed from an unreadable field", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await user.type(screen.getByLabelText("Miriam"), "1.256,4");
    await user.type(screen.getByLabelText("Simon"), "352,2");
    await user.type(screen.getByLabelText("Beide"), "273,8");
    await user.type(screen.getByLabelText("Gesamt"), "1052,4");

    // Counting the unreadable field as 0 would report a confident "626,0 km",
    // which reads as settled rather than as missing input.
    expect(screen.queryByText("626,0 km")).not.toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("asks for numbers instead of calculating from unreadable input", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await user.type(screen.getByLabelText("Miriam"), "hundert");
    await user.type(screen.getByLabelText("Simon"), "100");
    await user.type(screen.getByLabelText("Betrag"), "50");

    expect(screen.getByText(/nur Zahlen eintragen/)).toBeInTheDocument();
    expect(screen.getByLabelText("Miriam")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Simon")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("prompts for the car reading in 50/50 mode instead of showing 0,00 €", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await user.type(screen.getByLabelText("Miriam"), "100");
    await user.type(screen.getByLabelText("Simon"), "100");
    await user.type(screen.getByLabelText("Betrag"), "50");
    await user.click(
      screen.getByRole("checkbox", { name: "50/50-Modus verwenden" }),
    );

    // 50/50 divides by the car reading, so without one there is nothing to
    // divide by — that must read as "not ready", not as a 0,00 € split.
    expect(screen.getByText(/Tachostand eintragen/)).toBeInTheDocument();
    expect(result().queryByText("0,00 €")).not.toBeInTheDocument();
  });

  it("still splits when the device counted more than the car", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await user.type(screen.getByLabelText("Miriam"), "100");
    await user.type(screen.getByLabelText("Simon"), "100");
    await user.type(screen.getByLabelText("Beide"), "100");
    await user.type(screen.getByLabelText("Gesamt"), "150");
    await user.type(screen.getByLabelText("Betrag"), "90");

    expect(screen.getByText("-150,0 km (-100,0 %)")).toBeInTheDocument();
    expect(result().getAllByText("45,00 €")).toHaveLength(2);
  });

  it("keeps impossible negative shared kilometres out of 50/50 mode", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await user.type(screen.getByLabelText("Miriam"), "100");
    await user.type(screen.getByLabelText("Simon"), "100");
    await user.type(screen.getByLabelText("Beide"), "100");
    await user.type(screen.getByLabelText("Gesamt"), "150");
    await user.type(screen.getByLabelText("Betrag"), "90");

    expect(result().getAllByText("45,00 €")).toHaveLength(2);

    await user.click(
      screen.getByRole("checkbox", { name: "50/50-Modus verwenden" }),
    );

    expect(screen.getByText(/50\/50 passt/)).toBeInTheDocument();
    expect(result().queryByText("45,00 €")).not.toBeInTheDocument();
  });

  it("offers 50/50 as an explicit optional mode", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);
    const toggle = screen.getByRole("checkbox", {
      name: "50/50-Modus verwenden",
    });

    expect(toggle).not.toBeChecked();
    expect(screen.getByText(/Standard: proportional/)).toBeInTheDocument();
    expect(screen.getByText(/komplett zu „Beide“/)).toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toBeChecked();
  });
});
