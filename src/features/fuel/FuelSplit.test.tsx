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
    await user.click(screen.getByRole("radio", { name: "50/50" }));

    expect(result().getByText("46,36 €")).toBeInTheDocument();
    expect(result().getByText("55,64 €")).toBeInTheDocument();
  });

  it("shows the device shortfall against the car reading", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await fillSheetExample(user);

    expect(screen.getByText("882,4 km")).toBeInTheDocument();
    expect(screen.getByText("170,0 km (16,2 %)")).toBeInTheDocument();
  });

  it("accepts a period as the decimal separator", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await user.type(screen.getByLabelText("Miriam"), "100.5");
    await user.type(screen.getByLabelText("Simon"), "100.5");
    await user.type(screen.getByLabelText("Betrag"), "50");

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

  it("rejects a thousands separator rather than guessing at it", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    // There is no grouping separator, so "1.256,4" is not a number. Saying so
    // beats silently picking one of the two plausible readings.
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

  it("still shows the summaries once every field reads as a number", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await fillSheetExample(user);

    expect(screen.getByText("882,4 km")).toBeInTheDocument();
    expect(screen.getByText("170,0 km (16,2 %)")).toBeInTheDocument();
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
    await user.click(screen.getByRole("radio", { name: "50/50" }));

    // 50/50 divides by the car reading, so without one there is nothing to
    // divide by — that must read as "not ready", not as a 0,00 € split.
    expect(screen.getByText(/Tachostand eintragen/)).toBeInTheDocument();
    expect(result().queryByText("0,00 €")).not.toBeInTheDocument();
  });

  it("refuses to split when the device counted more than the car", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    await user.type(screen.getByLabelText("Miriam"), "100");
    await user.type(screen.getByLabelText("Simon"), "100");
    await user.type(screen.getByLabelText("Beide"), "100");
    await user.type(screen.getByLabelText("Gesamt"), "150");
    await user.type(screen.getByLabelText("Betrag"), "90");

    // This used to render shares of 66,7 % / 66,7 % / -33,3 %.
    expect(screen.getByText(/mehr Kilometer als das Auto/)).toBeInTheDocument();
  });

  it("gives the mode radios real radio-group keyboard behaviour", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    const [proportional, fiftyFifty] = screen.getAllByRole("radio");

    proportional.focus();
    await user.keyboard("{ArrowRight}");

    expect(fiftyFifty).toBeChecked();
    expect(proportional).not.toBeChecked();
  });

  it("explains both modes behind the info toggle", async () => {
    const user = userEvent.setup();
    render(<FuelSplit />);

    const info = screen.getByRole("button", {
      name: "Erklärung der Modi anzeigen",
    });
    expect(info).toHaveAttribute("aria-expanded", "false");

    await user.click(info);

    expect(info).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/nach gefahrenen Kilometern verteilt/)).toBeInTheDocument();
    expect(screen.getByText(/komplett zu „Beide“/)).toBeInTheDocument();
  });
});
