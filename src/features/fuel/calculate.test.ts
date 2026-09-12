import { describe, expect, it } from "vitest";

import { calculateTanken, type TankenInput } from "./calculate";

// The 12.12.2025 fill-up from the original spreadsheet, used as the reference
// case so the `beide` mode stays bug-compatible with the sheet's history.
const sheetFillUp: TankenInput = {
  kmMiriam: 256.4,
  kmSimon: 352.2,
  kmBeide: 273.8,
  kmAuto: 1052.4,
  bezahlt: 102,
};

describe("calculateTanken", () => {
  it("reproduces the spreadsheet's split in beide mode", () => {
    const result = calculateTanken(sheetFillUp, "beide");

    expect(result.zahltMiriam).toBeCloseTo(46.36, 2);
    expect(result.zahltSimon).toBeCloseTo(55.64, 2);
  });

  it("reproduces the spreadsheet's corrected shares in beide mode", () => {
    const result = calculateTanken(sheetFillUp, "beide");

    expect(result.anteilMiriam * 100).toBeCloseTo(24.4, 1);
    expect(result.anteilSimon * 100).toBeCloseTo(33.5, 1);
    expect(result.anteilBeide * 100).toBeCloseTo(42.2, 1);
  });

  it("reports the device shortfall against the car reading", () => {
    const result = calculateTanken(sheetFillUp, "beide");

    expect(result.summeGeraet).toBeCloseTo(882.4, 1);
    expect(result.differenz).toBeCloseTo(170, 1);
    expect(result.differenzAnteil * 100).toBeCloseTo(16.2, 1);
  });

  it("spreads the offset by kilometres driven in proportional mode", () => {
    const result = calculateTanken(sheetFillUp, "proportional");

    expect(result.anteilMiriam * 100).toBeCloseTo(29.1, 1);
    expect(result.anteilSimon * 100).toBeCloseTo(39.9, 1);
    expect(result.zahltMiriam).toBeCloseTo(45.46, 2);
    expect(result.zahltSimon).toBeCloseTo(56.54, 2);
  });

  it("always splits the full amount between the two drivers", () => {
    for (const mode of ["proportional", "beide"] as const) {
      const { zahltMiriam, zahltSimon } = calculateTanken(sheetFillUp, mode);

      expect(zahltMiriam + zahltSimon).toBeCloseTo(sheetFillUp.bezahlt, 6);
    }
  });

  it("charges only the driver who drove when nothing is shared", () => {
    const result = calculateTanken(
      { kmMiriam: 100, kmSimon: 0, kmBeide: 0, kmAuto: 100, bezahlt: 50 },
      "proportional",
    );

    expect(result.zahltMiriam).toBeCloseTo(50, 6);
    expect(result.zahltSimon).toBeCloseTo(0, 6);
  });

  it("halves a purely shared trip", () => {
    const result = calculateTanken(
      { kmMiriam: 0, kmSimon: 0, kmBeide: 200, kmAuto: 200, bezahlt: 80 },
      "proportional",
    );

    expect(result.zahltMiriam).toBeCloseTo(40, 6);
    expect(result.zahltSimon).toBeCloseTo(40, 6);
  });

  it("ignores kmAuto for the euro split in proportional mode", () => {
    const withOffset = calculateTanken(sheetFillUp, "proportional");
    const withoutOffset = calculateTanken(
      { ...sheetFillUp, kmAuto: 882.4 },
      "proportional",
    );

    expect(withOffset.zahltMiriam).toBeCloseTo(withoutOffset.zahltMiriam, 6);
  });

  it("returns zeros instead of NaN when no kilometres were entered", () => {
    const result = calculateTanken(
      { kmMiriam: 0, kmSimon: 0, kmBeide: 0, kmAuto: 0, bezahlt: 60 },
      "beide",
    );

    expect(result.zahltMiriam).toBe(0);
    expect(result.zahltSimon).toBe(0);
    expect(result.anteilBeide).toBe(0);
  });

  it("handles a car reading below the device sum without going negative", () => {
    const result = calculateTanken(
      { kmMiriam: 100, kmSimon: 100, kmBeide: 100, kmAuto: 280, bezahlt: 90 },
      "beide",
    );

    expect(result.differenz).toBeCloseTo(-20, 6);
    expect(result.zahltMiriam + result.zahltSimon).toBeCloseTo(90, 6);
  });
});
