/**
 * Parses a kilometre or euro amount as typed into the form.
 *
 * The comma is the decimal separator. A dot is accepted as the same thing,
 * because phone keypads offer whichever they feel like. There is deliberately
 * no thousands separator: "1.234" is unambiguously 1234, not 1,234, so a
 * mistyped odometer reading cannot silently become a 1000x error.
 *
 * Returns `null` for anything unreadable so the caller can tell "not filled in
 * yet" apart from "typed something I did not understand" — coercing junk to 0
 * is what makes a wrong split look authoritative.
 */
export function parseNumber(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  // Digits, then at most one separator followed by more digits.
  if (!/^\d*[.,]?\d*$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}
