import type { FuelFillUpEntry } from "./types";

/** An inclusive yyyy-mm-dd date range. */
export type DateRange = {
  from: string;
  to: string;
};

export type FuelSummary = {
  fillUpCount: number;
  /** Oldest and newest fill-up actually in range, not the range bounds. */
  firstFilledOn: string | null;
  lastFilledOn: string | null;
  carKmTotal: number;
  miriamKm: number;
  simonKm: number;
  sharedKm: number;
  /** Car kilometres no device reading accounts for. */
  offsetKm: number;
  /**
   * Shares of `carKmTotal`, 0–1. The three driver shares plus `offsetShare`
   * sum to 1; on their own they do not, which is what the spreadsheet shows.
   */
  miriamKmShare: number;
  simonKmShare: number;
  sharedKmShare: number;
  offsetShare: number;
  paidTotal: number;
  miriamPaid: number;
  simonPaid: number;
  /** Shares of `paidTotal`, 0–1. These two do sum to 1. */
  miriamPaidShare: number;
  simonPaidShare: number;
  averagePaid: number;
  averageCarKm: number;
};

/**
 * Keeps the fill-ups inside an inclusive date range.
 *
 * Compares yyyy-mm-dd strings directly: that order is chronological, and it
 * avoids the timezone shift parsing a bare date brings.
 */
export function filterByRange(
  entries: FuelFillUpEntry[],
  { from, to }: DateRange,
): FuelFillUpEntry[] {
  return entries.filter(
    (entry) => entry.filledOn >= from && entry.filledOn <= to,
  );
}

/**
 * Totals a set of fill-ups over a period.
 *
 * Kilometre percentages divide by the car reading, so the three driver shares
 * fall short of 100% by whatever the tracking device missed; `offsetShare` is
 * that remainder, and the four together make up the whole distance.
 */
export function summarizeFillUps(entries: FuelFillUpEntry[]): FuelSummary {
  const sum = (pick: (entry: FuelFillUpEntry) => number) =>
    entries.reduce((total, entry) => total + pick(entry), 0);

  const carKmTotal = sum((entry) => entry.carKm);
  const miriamKm = sum((entry) => entry.miriamKm);
  const simonKm = sum((entry) => entry.simonKm);
  const sharedKm = sum((entry) => entry.sharedKm);
  const paidTotal = sum((entry) => entry.paidAmount);
  const miriamPaid = sum((entry) => entry.miriamAmount);
  const simonPaid = sum((entry) => entry.simonAmount);

  // An empty range has no basis to divide by, and every share collapses to 0
  // rather than to NaN — the panel renders those as "0,0 %", not as "NaN %".
  const kmShare = (value: number) => (carKmTotal > 0 ? value / carKmTotal : 0);
  const paidShare = (value: number) => (paidTotal > 0 ? value / paidTotal : 0);

  // `entries` arrives newest first, but a caller could hand over any order, so
  // the bounds come from the values rather than from the ends of the list.
  const dates = entries.map((entry) => entry.filledOn).sort();

  return {
    fillUpCount: entries.length,
    firstFilledOn: dates.at(0) ?? null,
    lastFilledOn: dates.at(-1) ?? null,
    carKmTotal,
    miriamKm,
    simonKm,
    sharedKm,
    offsetKm: carKmTotal - (miriamKm + simonKm + sharedKm),
    miriamKmShare: kmShare(miriamKm),
    simonKmShare: kmShare(simonKm),
    sharedKmShare: kmShare(sharedKm),
    offsetShare: kmShare(carKmTotal - (miriamKm + simonKm + sharedKm)),
    paidTotal,
    miriamPaid,
    simonPaid,
    miriamPaidShare: paidShare(miriamPaid),
    simonPaidShare: paidShare(simonPaid),
    averagePaid: entries.length > 0 ? paidTotal / entries.length : 0,
    averageCarKm: entries.length > 0 ? carKmTotal / entries.length : 0,
  };
}
