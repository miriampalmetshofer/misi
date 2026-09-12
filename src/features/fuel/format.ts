export const km = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export const percent = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const fillUpDate = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Formats a yyyy-mm-dd date for display.
 *
 * Parsed field by field rather than through `new Date(value)`: that parses a
 * bare date as UTC midnight, which renders as the previous day for anyone
 * behind it.
 */
export function formatFillUpDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return fillUpDate.format(new Date(year, month - 1, day));
}
