import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TankenRechner } from "./TankenRechner";

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

describe("TankenRechner", () => {
  it("prefills the date with today but leaves it editable", async () => {
    const user = userEvent.setup();
    render(<TankenRechner />);

    const datum = screen.getByLabelText("Datum") as HTMLInputElement;
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    expect(datum.value).toBe(expected);

    await user.clear(datum);
    await user.type(datum, "2025-12-12");
    expect(datum.value).toBe("2025-12-12");
  });

  it("prompts for kilometres before anything is entered", () => {
    render(<TankenRechner />);

    expect(
      screen.getByText(/Kilometer eintragen/),
    ).toBeInTheDocument();
  });

  it("splits the amount proportionally by default", async () => {
    const user = userEvent.setup();
    render(<TankenRechner />);

    await fillSheetExample(user);

    expect(result().getByText("45,46 €")).toBeInTheDocument();
    expect(result().getByText("56,54 €")).toBeInTheDocument();
  });

  it("switches to the spreadsheet's 50/50 split on demand", async () => {
    const user = userEvent.setup();
    render(<TankenRechner />);

    await fillSheetExample(user);
    await user.click(screen.getByRole("radio", { name: "50/50" }));

    expect(result().getByText("46,36 €")).toBeInTheDocument();
    expect(result().getByText("55,64 €")).toBeInTheDocument();
  });

  it("shows the device shortfall against the car reading", async () => {
    const user = userEvent.setup();
    render(<TankenRechner />);

    await fillSheetExample(user);

    expect(screen.getByText("882,4 km")).toBeInTheDocument();
    expect(screen.getByText("170,0 km (16,2 %)")).toBeInTheDocument();
  });

  it("accepts a period as the decimal separator", async () => {
    const user = userEvent.setup();
    render(<TankenRechner />);

    await user.type(screen.getByLabelText("Miriam"), "100.5");
    await user.type(screen.getByLabelText("Simon"), "100.5");
    await user.type(screen.getByLabelText("Betrag"), "50");

    expect(result().getAllByText("25,00 €")).toHaveLength(2);
  });

  it("explains both modes behind the info toggle", async () => {
    const user = userEvent.setup();
    render(<TankenRechner />);

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
