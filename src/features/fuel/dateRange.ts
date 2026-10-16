import { today } from "./useFuelSplitForm";
import type { DateRange } from "./summarize";

/** How far back the overview reaches until someone picks a range themselves. */
const DEFAULT_RANGE_MONTHS = 3;

/**
 * Moves a yyyy-mm-dd date back by whole months, returning yyyy-mm-dd.
 *
 * The day is clamped to the target month, so 31 May minus three months is
 * 28 February rather than overflowing into March.
 */
export function monthsBefore(value: string, months: number): string {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  // Day 0 of the following month is the last day of the one before it.
  const lastDayOfTarget = new Date(year, month - months, 0).getDate();
  const target = new Date(
    year,
    month - 1 - months,
    Math.min(day, lastDayOfTarget),
  );

  return toDateValue(target);
}

/** The DateRange for the last DEFAULT_RANGE_MONTHS months, ending today. */
export function defaultRange(): DateRange {
  const to = today();
  return { from: monthsBefore(to, DEFAULT_RANGE_MONTHS), to };
}

/** Formats a local Date as yyyy-mm-dd, avoiding `toISOString`'s UTC shift. */
export function toDateValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Parses yyyy-mm-dd into a local Date.
 *
 * Picked apart by hand rather than passed to `new Date(value)`: that reads a
 * bare date as UTC midnight, which is the previous day for anyone behind it.
 */
export function fromDateValue(value: string): Date | undefined {
  const [year, month, day] = value.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : undefined;
}
