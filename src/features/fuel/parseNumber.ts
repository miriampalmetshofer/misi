/**
 * Parses a kilometre or euro amount as typed into the form.
 *
 * The comma is the only decimal separator; the form turns a typed dot into one
 * before it gets here. There is no thousands separator, so "1.234" reads as
 * 1,234 — a number with three decimals rather than a grouped 1234.
 *
 * Returns `null` for anything unreadable so the caller can tell "not filled in
 * yet" apart from "typed something I did not understand" — coercing junk to 0
 * is what makes a wrong split look authoritative.
 */
export function parseNumber(value: string): number | null {
  const trimmed = value.trim();

  // Digits, then at most one comma followed by any number of decimal digits.
  if (!/^\d*(?:,\d*)?$/.test(trimmed) || trimmed === "") {
    return null;
  }

  return Number(trimmed.replace(",", "."));
}
