/**
 * Parses a kilometre or euro amount as typed into the form.
 *
 * The comma is the only decimal separator; the form turns a typed dot into one
 * before it gets here. Thousands separators are deliberately unsupported, so
 * "1.234" is unreadable rather than silently either 1234 or 1.234.
 *
 * Returns `null` for anything unreadable so the caller can tell "not filled in
 * yet" apart from "typed something I did not understand" — coercing junk to 0
 * is what makes a wrong split look authoritative.
 */
export function parseNumber(value: string): number | null {
  const trimmed = value.trim();

  // Digits, then at most one comma followed by up to two decimal digits.
  if (!/^\d*(?:,\d{0,2})?$/.test(trimmed) || trimmed === "") {
    return null;
  }

  return Number(trimmed.replace(",", "."));
}
