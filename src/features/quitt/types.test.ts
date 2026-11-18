import { describe, expect, it } from "vitest";
import { balanceCents, parseCents, validDate, type AutoQuittEntry, type QuittEntry } from "./types";
const entry = (changes: Partial<QuittEntry> = {}): QuittEntry => ({
  id: "1",
  version: 1,
  kind: "expense",
  description: "Einkauf",
  amountCents: 4800,
  paidBy: "miriam",
  forWhom: "both",
  occurredOn: "2026-11-17",
  ...changes,
});
describe("Quitt balance", () => {
  it("splits expenses, nets opposite debts and accounts for partial and full payments", () => {
    const expenses = [entry(), entry({ paidBy: "simon", amountCents: 1000 })];
    expect(balanceCents(expenses)).toBe(1900);
    expect(
      balanceCents([
        ...expenses,
        entry({ kind: "payment", paidBy: "simon", amountCents: 900 }),
      ]),
    ).toBe(1000);
    expect(
      balanceCents([
        ...expenses,
        entry({ kind: "payment", paidBy: "simon", amountCents: 1900 }),
      ]),
    ).toBe(0);
  });
  it("assigns personal expenses and rounds the payer's share up", () => {
    expect(balanceCents([entry({ forWhom: "miriam" })])).toBe(0);
    expect(balanceCents([entry({ forWhom: "simon" })])).toBe(4800);
    expect(balanceCents([entry({ amountCents: 101 })])).toBe(50);
    expect(balanceCents([entry({ amountCents: 101, paidBy: "simon" })])).toBe(
      -50,
    );
    expect(balanceCents([])).toBe(0);
  });
});
it.each(["0", "-1", "1.001", "1e3", "NaN", "10000000", "1.000,00", ""])(
  "rejects invalid money %s",
  (value) => expect(parseCents(value)).toBeNull(),
);
it("parses cents exactly", () => {
  expect(parseCents("12,30")).toBe(1230);
  expect(parseCents("0.01")).toBe(1);
  expect(parseCents("9999999.99")).toBe(999999999);
});
it("rejects impossible calendar dates", () => {
  expect(validDate("2026-02-30")).toBe(false);
  expect(validDate("2026-02-29")).toBe(false);
  expect(validDate("2024-02-29")).toBe(true);
  expect(validDate("0000-01-01")).toBe(false);
});


it("nets exact auto shares with manual expenses and partial repayments without dropping expenses", () => {
  const fuel: AutoQuittEntry = {
    source: "fuel", id: "fuel", kind: "expense", description: "Tanken",
    amountCents: 10200, paidBy: "miriam", miriamAmountCents: 4546,
    simonAmountCents: 5654, occurredOn: "2026-11-17",
  };
  const car: AutoQuittEntry = {
    ...fuel, source: "car", id: "car", description: "Reparatur",
    amountCents: 48000, paidBy: "simon", miriamAmountCents: 19200,
    simonAmountCents: 28800,
  };
  const expenses = [fuel, car, entry()];
  expect(balanceCents(expenses)).toBe(-11146);
  const partial = entry({ kind: "payment", paidBy: "miriam", amountCents: 4000 });
  expect(balanceCents([...expenses, partial])).toBe(-7146);
  expect(balanceCents([
    ...expenses, partial,
    entry({ kind: "payment", paidBy: "miriam", amountCents: 7146 }),
  ])).toBe(0);
  expect(balanceCents([{ ...fuel, miriamAmountCents: 10200, simonAmountCents: 0 }])).toBe(0);
});
