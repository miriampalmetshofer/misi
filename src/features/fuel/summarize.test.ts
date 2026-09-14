import { describe, expect, it } from "vitest";

import { filterByRange, summarizeFillUps } from "./summarize";
import type { FuelFillUpEntry } from "./types";

function entry(overrides: Partial<FuelFillUpEntry> = {}): FuelFillUpEntry {
  return {
    id: crypto.randomUUID(),
    filledOn: "2026-01-15",
    miriamKm: 100,
    simonKm: 200,
    sharedKm: 100,
    carKm: 500,
    paidAmount: 100,
    offsetMode: "proportional",
    miriamAmount: 40,
    simonAmount: 60,
    ...overrides,
  };
}

/**
 * A row as the spreadsheet listed it: the three device readings together, and
 * the two euro amounts together, rather than eight numbers in a row.
 */
type SheetRow = {
  on: string;
  /** Miriam, Simon, Beide — the order the sheet's columns ran in. */
  device: [number, number, number];
  car: number;
  paid: number;
  /** What each of them owed: Miriam, Simon. */
  split: [number, number];
};

function fromSheetRow({ on, device, car, paid, split }: SheetRow) {
  const [miriamKm, simonKm, sharedKm] = device;
  const [miriamAmount, simonAmount] = split;

  return entry({
    filledOn: on,
    miriamKm,
    simonKm,
    sharedKm,
    carKm: car,
    paidAmount: paid,
    miriamAmount,
    simonAmount,
  });
}

describe("filterByRange", () => {
  it("keeps both ends of the range", () => {
    const entries = [
      entry({ filledOn: "2026-01-01" }),
      entry({ filledOn: "2026-02-15" }),
      entry({ filledOn: "2026-03-31" }),
    ];

    const kept = filterByRange(entries, {
      from: "2026-01-01",
      to: "2026-03-31",
    });

    expect(kept).toHaveLength(3);
  });

  it("drops fill-ups on either side of the range", () => {
    const entries = [
      entry({ filledOn: "2025-12-31" }),
      entry({ filledOn: "2026-02-15" }),
      entry({ filledOn: "2026-04-01" }),
    ];

    const kept = filterByRange(entries, {
      from: "2026-01-01",
      to: "2026-03-31",
    });

    expect(kept.map((item) => item.filledOn)).toEqual(["2026-02-15"]);
  });
});

describe("summarizeFillUps", () => {
  it("reproduces the spreadsheet's Oktober 2025 – April 2026 totals", () => {
    // The real rows from the sheet this overview replaces, so the panel can be
    // checked against numbers that were calculated somewhere else entirely.
    // Grouped rather than left as one long positional row: `device` and `split`
    // are the shapes the domain already thinks in, so a wrong column is visible
    // here instead of being the eighth number along.
    const rows: SheetRow[] = [
      {
        on: "2025-10-17",
        device: [160.9, 679.7, 211.5],
        car: 1071.0,
        paid: 97.25,
        split: [25.07, 72.18],
      },
      {
        on: "2025-10-26",
        device: [81.2, 379.9, 339.2],
        car: 1007.3,
        paid: 96.18,
        split: [33.83, 62.35],
      },
      {
        on: "2025-11-07",
        device: [139.6, 408.0, 134.1],
        car: 857.0,
        paid: 81.0,
        split: [27.82, 53.18],
      },
      {
        on: "2025-11-18",
        device: [9.4, 313.3, 578.4],
        car: 1077.0,
        paid: 99.96,
        split: [35.88, 64.08],
      },
      {
        on: "2025-11-28",
        device: [0.0, 547.2, 83.3],
        car: 773.0,
        paid: 76.02,
        split: [11.1, 64.92],
      },
      {
        on: "2025-12-12",
        device: [256.4, 352.2, 273.8],
        car: 1052.4,
        paid: 102.0,
        split: [46.36, 55.64],
      },
      {
        on: "2025-12-24",
        device: [258.7, 198.1, 383.3],
        car: 1047.0,
        paid: 95.01,
        split: [50.25, 44.76],
      },
      {
        on: "2026-01-04",
        device: [141.6, 65.6, 555.1],
        car: 959.0,
        paid: 87.99,
        split: [47.48, 40.51],
      },
      {
        on: "2026-01-15",
        device: [213.9, 441.7, 147.4],
        car: 985.0,
        paid: 95.14,
        split: [36.57, 58.57],
      },
      {
        on: "2026-01-25",
        device: [201.6, 186.0, 117.0],
        car: 903.0,
        paid: 90.35,
        split: [45.96, 44.39],
      },
      {
        on: "2026-02-01",
        device: [85.6, 192.6, 456.4],
        car: 914.2,
        paid: 77.19,
        split: [34.08, 43.11],
      },
      {
        on: "2026-02-11",
        device: [524.1, 299.9, 47.5],
        car: 1102.1,
        paid: 92.0,
        split: [55.36, 36.64],
      },
      {
        on: "2026-02-24",
        device: [63.1, 150.2, 485.4],
        car: 995.4,
        paid: 97.0,
        split: [44.26, 52.74],
      },
      {
        on: "2026-03-05",
        device: [13.9, 105.2, 852.6],
        car: 1197.9,
        paid: 121.25,
        split: [56.0, 65.25],
      },
      {
        on: "2026-03-21",
        device: [131.3, 503.4, 152.6],
        car: 1095.7,
        paid: 114.19,
        split: [37.71, 76.48],
      },
      {
        on: "2026-04-23",
        device: [391.2, 66.8, 363.6],
        car: 1158.3,
        paid: 135.32,
        split: [86.61, 48.71],
      },
    ];

    const entries = rows.map(fromSheetRow);

    const summary = summarizeFillUps(entries);

    expect(summary.fillUpCount).toBe(16);
    expect(summary.firstFilledOn).toBe("2025-10-17");
    expect(summary.lastFilledOn).toBe("2026-04-23");
    expect(summary.carKmTotal).toBeCloseTo(16195.3, 1);
    expect(summary.miriamKm).toBeCloseTo(2672.5, 1);
    expect(summary.simonKm).toBeCloseTo(4889.8, 1);
    expect(summary.sharedKm).toBeCloseTo(5181.2, 1);
    expect(summary.paidTotal).toBeCloseTo(1557.85, 2);
    expect(summary.miriamPaid).toBeCloseTo(674.34, 2);
    expect(summary.simonPaid).toBeCloseTo(883.51, 2);

    // The sheet's own percentages, to one decimal as it displayed them.
    expect(summary.miriamKmShare * 100).toBeCloseTo(16.5, 1);
    expect(summary.simonKmShare * 100).toBeCloseTo(30.2, 1);
    expect(summary.sharedKmShare * 100).toBeCloseTo(32.0, 1);
    expect(summary.miriamPaidShare * 100).toBeCloseTo(43.3, 1);
    expect(summary.simonPaidShare * 100).toBeCloseTo(56.7, 1);

    expect(summary.averagePaid).toBeCloseTo(97.37, 2);
    expect(summary.averageCarKm).toBeCloseTo(1012.2, 1);
  });

  it("accounts for the whole car distance across the four km shares", () => {
    const summary = summarizeFillUps([
      entry({ miriamKm: 100, simonKm: 200, sharedKm: 100, carKm: 500 }),
    ]);

    expect(summary.offsetKm).toBe(100);
    expect(
      summary.miriamKmShare +
        summary.simonKmShare +
        summary.sharedKmShare +
        summary.offsetShare,
    ).toBeCloseTo(1, 10);
  });

  it("reads as zero rather than NaN with nothing in range", () => {
    const summary = summarizeFillUps([]);

    expect(summary.fillUpCount).toBe(0);
    expect(summary.firstFilledOn).toBeNull();
    expect(summary.lastFilledOn).toBeNull();
    expect(summary.miriamKmShare).toBe(0);
    expect(summary.miriamPaidShare).toBe(0);
    expect(summary.averagePaid).toBe(0);
    expect(summary.averageCarKm).toBe(0);
  });

  it("takes the bounds from the dates, not from the ends of the list", () => {
    const summary = summarizeFillUps([
      entry({ filledOn: "2026-02-15" }),
      entry({ filledOn: "2026-01-02" }),
      entry({ filledOn: "2026-03-20" }),
    ]);

    expect(summary.firstFilledOn).toBe("2026-01-02");
    expect(summary.lastFilledOn).toBe("2026-03-20");
  });
});
