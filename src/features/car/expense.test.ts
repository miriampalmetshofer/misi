import { describe, expect, it } from "vitest";

import { isExpenseDate, parseDecimal, splitExpense } from "./expense";

describe("expense amounts", () => {
  it.each([
    ["480", 480],
    ["12,34", 12.34],
    ["12.34", 12.34],
    ["0", 0],
    ["", null],
    ["-1", null],
    ["100001", null],
    ["1,234", null],
    ["1.000,00", null],
    ["Infinity", null],
    [",", null],
  ])("parses %s without losing precision", (raw, expected) => {
    expect(parseDecimal(raw, 100_000)).toBe(expected);
  });

  it("keeps a leftover cent in the total", () => {
    expect(splitExpense(0.05, 50)).toEqual({
      miriamAmount: 0.03,
      simonAmount: 0.02,
    });
    expect(splitExpense(480, 40)).toEqual({
      miriamAmount: 192,
      simonAmount: 288,
    });
  });

  it.each([0, 33.33, 50, 66.67, 100])(
    "settles the whole bill at %s percent",
    (share) => {
      for (const amount of [0.01, 99.99, 1234.56, 100_000]) {
        const split = splitExpense(amount, share);
        expect(
          Math.round(split.miriamAmount * 100) +
            Math.round(split.simonAmount * 100),
        ).toBe(Math.round(amount * 100));
      }
    },
  );
});

describe("expense dates", () => {
  it.each([
    "2026-02-29",
    "2026-02-30",
    "2026-13-01",
    "31.10.2026",
    "0000-01-01",
    "",
  ])("refuses %s", (value) => {
    expect(isExpenseDate(value)).toBe(false);
  });
  it("accepts a real leap day", () =>
    expect(isExpenseDate("2028-02-29")).toBe(true));
});
