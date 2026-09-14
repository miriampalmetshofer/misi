import { today } from "./useFuelSplitForm";
import type { DateRange } from "./summarize";

/** How far back the overview reaches until someone picks a range themselves. */
export const DEFAULT_RANGE_MONTHS = 3;

/**
 * Moves a yyyy-mm-dd date back by whole months.
 *
 * `setMonth` overflows when the target month is shorter — 31 May back three
 * months would land on 3 March rather than on some day in February. Building
 * the date with a clamped day keeps it inside the month it names, so the range
 * never quietly reaches further back than it says.
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

  return toDateInputValue(target);
}

/** The last `DEFAULT_RANGE_MONTHS` months, ending today. */
export function defaultRange(): DateRange {
  const to = today();
  return { from: monthsBefore(to, DEFAULT_RANGE_MONTHS), to };
}

/** Formats a local Date as yyyy-mm-dd, avoiding `toISOString`'s UTC shift. */
function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
