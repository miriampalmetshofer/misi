/** Today as yyyy-mm-dd in local time, which is what <input type="date"> wants. */
export function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

const calendarDate = new Intl.DateTimeFormat("de-DE", {
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
export function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return calendarDate.format(new Date(year, month - 1, day));
}
