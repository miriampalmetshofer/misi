import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ setPaymentSettled: vi.fn() }));
import { setPaymentSettled } from "./actions";
import { FillUpRow } from "@/features/fuel/FillUpRow";
import { ExpenseRow } from "@/features/car/ExpenseRow";

const base = {
  id: "11111111-1111-1111-1111-111111111111",
  isSettled: false,
  miriamAmount: 40,
  simonAmount: 60,
};
const fuel = {
  ...base,
  filledOn: "2026-10-24",
  miriamKm: 40,
  simonKm: 60,
  sharedKm: 0,
  carKm: 100,
  paidAmount: 100,
  offsetMode: "proportional" as const,
};
const expense = {
  ...base,
  spentOn: "2026-10-24",
  description: "Reparatur",
  totalAmount: 100,
  miriamPercent: 40,
  note: "Werkstatt",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(setPaymentSettled).mockResolvedValue({ error: null });
});

it.each(["fuel", "expense"] as const)(
  "keeps %s status compact and saves from the expanded details",
  async (kind) => {
    const user = userEvent.setup();
    const row = (isSettled: boolean) =>
      kind === "fuel" ? (
        <FillUpRow entry={{ ...fuel, isSettled }} onDelete={() => {}} />
      ) : (
        <ExpenseRow
          entry={{ ...expense, isSettled }}
          isEditing={false}
          onEdit={() => {}}
        />
      );
    const { rerender } = render(row(false));
    expect(screen.queryByText("Zahlung beglichen")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { expanded: false }));
    await user.click(
      screen.getByRole("checkbox", { name: "Zahlung beglichen" }),
    );
    expect(setPaymentSettled).toHaveBeenCalledWith(kind, base.id, true);
    rerender(row(true));
    expect(screen.getByRole("checkbox")).toBeChecked();
    await user.click(screen.getByRole("checkbox"));
    expect(setPaymentSettled).toHaveBeenLastCalledWith(kind, base.id, false);
    await user.click(screen.getByRole("button", { expanded: true }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { expanded: false })).getByText(
        "Zahlung beglichen",
      ),
    ).toBeInTheDocument();
    rerender(row(false));
    expect(screen.queryByText("Zahlung beglichen")).not.toBeInTheDocument();
  },
);

it("blocks repeated changes while saving and lets a failed payment update be retried", async () => {
  const user = userEvent.setup();
  let finish!: (result: { error: string | null }) => void;
  vi.mocked(setPaymentSettled).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(<FillUpRow entry={fuel} onDelete={() => {}} />);
  await user.click(screen.getByRole("button", { expanded: false }));
  await user.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("checkbox")).toHaveAttribute("aria-disabled", "true");
  await user.click(screen.getByRole("checkbox"));
  expect(setPaymentSettled).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish({ error: "Speichern fehlgeschlagen" });
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Speichern fehlgeschlagen",
  );
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  expect(screen.getByRole("checkbox")).not.toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await user.click(screen.getByRole("checkbox"));
  expect(setPaymentSettled).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
