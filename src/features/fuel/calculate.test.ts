import { describe, expect, it } from "vitest";

import { calculateFuelSplit, type FuelSplitInput } from "./calculate";

const sheetFillUp: FuelSplitInput = {
  miriamKm: 256.4,
  simonKm: 352.2,
  sharedKm: 273.8,
  carKm: 1052.4,
  paidAmount: 102,
};

describe("calculateFuelSplit", () => {
  it("reproduces the spreadsheet's split in shared mode", () => {
    const result = calculateFuelSplit(sheetFillUp, "shared");

    expect(result.miriamAmount).toBeCloseTo(46.36, 2);
    expect(result.simonAmount).toBeCloseTo(55.64, 2);
  });

  it("reproduces the spreadsheet's corrected shares in shared mode", () => {
    const result = calculateFuelSplit(sheetFillUp, "shared");

    expect(result.miriamDistanceShare * 100).toBeCloseTo(24.4, 1);
    expect(result.simonDistanceShare * 100).toBeCloseTo(33.5, 1);
    expect(result.sharedDistanceShare * 100).toBeCloseTo(42.2, 1);
  });

  it("reports the device shortfall against the car reading", () => {
    const result = calculateFuelSplit(sheetFillUp, "shared");

    expect(result.deviceKmTotal).toBeCloseTo(882.4, 1);
    expect(result.distanceOffset).toBeCloseTo(170, 1);
    expect(result.distanceOffsetShare * 100).toBeCloseTo(16.2, 1);
  });

  it("spreads the offset by kilometres driven in proportional mode", () => {
    const result = calculateFuelSplit(sheetFillUp, "proportional");

    expect(result.miriamDistanceShare * 100).toBeCloseTo(29.1, 1);
    expect(result.simonDistanceShare * 100).toBeCloseTo(39.9, 1);
    expect(result.miriamAmount).toBeCloseTo(45.46, 2);
    expect(result.simonAmount).toBeCloseTo(56.54, 2);
  });

  it("reports bill shares that sum to 100 % and match the euro amounts", () => {
    for (const mode of ["proportional", "shared"] as const) {
      const r = calculateFuelSplit(sheetFillUp, mode);

      expect(r.miriamBillShare + r.simonBillShare).toBeCloseTo(1, 6);
      expect(r.miriamBillShare * sheetFillUp.paidAmount).toBeCloseTo(
        r.miriamAmount,
        6,
      );
      expect(r.simonBillShare * sheetFillUp.paidAmount).toBeCloseTo(
        r.simonAmount,
        6,
      );
    }
  });

  it("keeps the bill share above the personal distance share", () => {
    // A mostly-shared trip: the personal distance shares are tiny, but each
    // person still carries about half the bill. Showing the distance share
    // next to the euro amount made the two look unrelated.
    const r = calculateFuelSplit(
      { miriamKm: 15, simonKm: 55, sharedKm: 1150, carKm: 1220, paidAmount: 120 },
      "proportional",
    );

    expect(r.miriamDistanceShare * 100).toBeCloseTo(1.2, 1);
    expect(r.miriamBillShare * 100).toBeCloseTo(48.4, 1);
    expect(r.simonBillShare * 100).toBeCloseTo(51.6, 1);
  });

  it("always splits the full amount between the two drivers", () => {
    for (const mode of ["proportional", "shared"] as const) {
      const { miriamAmount, simonAmount } = calculateFuelSplit(sheetFillUp, mode);

      expect(miriamAmount + simonAmount).toBeCloseTo(sheetFillUp.paidAmount, 6);
    }
  });

  it("charges only the driver who drove when nothing is shared", () => {
    const result = calculateFuelSplit(
      { miriamKm: 100, simonKm: 0, sharedKm: 0, carKm: 100, paidAmount: 50 },
      "proportional",
    );

    expect(result.miriamAmount).toBeCloseTo(50, 6);
    expect(result.simonAmount).toBeCloseTo(0, 6);
  });

  it("halves a purely shared trip", () => {
    const result = calculateFuelSplit(
      { miriamKm: 0, simonKm: 0, sharedKm: 200, carKm: 200, paidAmount: 80 },
      "proportional",
    );

    expect(result.miriamAmount).toBeCloseTo(40, 6);
    expect(result.simonAmount).toBeCloseTo(40, 6);
  });

  it("ignores carKm for the euro split in proportional mode", () => {
    const withOffset = calculateFuelSplit(sheetFillUp, "proportional");
    const withoutOffset = calculateFuelSplit(
      { ...sheetFillUp, carKm: 882.4 },
      "proportional",
    );

    expect(withOffset.miriamAmount).toBeCloseTo(withoutOffset.miriamAmount, 6);
  });

  it("returns zeros instead of NaN when no kilometres were entered", () => {
    const result = calculateFuelSplit(
      { miriamKm: 0, simonKm: 0, sharedKm: 0, carKm: 0, paidAmount: 60 },
      "shared",
    );

    expect(result.miriamAmount).toBe(0);
    expect(result.simonAmount).toBe(0);
    expect(result.sharedDistanceShare).toBe(0);
  });

  // Unsaveable, but the form calculates on every keystroke and so passes
  // half-entered readings through here.
  it("keeps a negative difference when the device sum is above the car reading", () => {
    const result = calculateFuelSplit(
      { miriamKm: 100, simonKm: 100, sharedKm: 100, carKm: 280, paidAmount: 90 },
      "shared",
    );

    expect(result.distanceOffset).toBeCloseTo(-20, 6);
    expect(result.miriamAmount + result.simonAmount).toBeCloseTo(90, 6);
  });
});
