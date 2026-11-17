import type { Person } from "@/lib/people";
export { people, isPerson } from "@/lib/people";
export type { Person } from "@/lib/people";
export type QuittEntry = {
  id: string;
  version: number;
  kind: "expense" | "payment";
  description: string;
  amountCents: number;
  paidBy: Person;
  forWhom: Person | "both";
  occurredOn: string;
};

export type AutoQuittEntry = {
  source: "fuel" | "car";
  id: string;
  kind: "expense";
  description: string;
  amountCents: number;
  paidBy: Person;
  miriamAmountCents: number;
  simonAmountCents: number;
  occurredOn: string;
};

export type QuittHistoryEntry = QuittEntry | AutoQuittEntry;

export function isAutoEntry(entry: QuittHistoryEntry): entry is AutoQuittEntry {
  return "source" in entry;
}

export function parseCents(value: string): number | null {
  if (!/^\d{1,7}([,.]\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return cents > 0 ? cents : null;
}

export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !value.startsWith("0000") &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function householdToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Positive means Simon owes Miriam. The payer keeps an indivisible extra cent.
export function balanceCents(entries: QuittHistoryEntry[]) {
  return entries.reduce((balance, entry) => {
    const sign = entry.paidBy === "miriam" ? 1 : -1;
    if (entry.kind === "payment") return balance + sign * entry.amountCents;
    if (isAutoEntry(entry)) {
      const owed = entry.paidBy === "miriam"
        ? entry.simonAmountCents
        : entry.miriamAmountCents;
      return balance + sign * owed;
    }
    const owed =
      entry.forWhom === "both"
        ? Math.floor(entry.amountCents / 2)
        : entry.forWhom === entry.paidBy
          ? 0
          : entry.amountCents;
    return balance + sign * owed;
  }, 0);
}
