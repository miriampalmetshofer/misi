import { parseNumber } from "@/features/fuel/parseNumber";

export type CarExpenseEntry = {
  id: string;
  spentOn: string;
  description: string;
  totalAmount: number;
  miriamPercent: number;
  miriamAmount: number;
  simonAmount: number;
  note: string;
};

export function parseDecimal(value: string, max: number) {
  const normalized = value.trim().replace(".", ",");
  const number = parseNumber(normalized);
  return /^\d+(?:,\d{0,2})?$/.test(normalized) &&
    number !== null &&
    number >= 0 &&
    number <= max
    ? number
    : null;
}

export function splitExpense(total: number, miriamPercent: number) {
  const totalCents = Math.round(total * 100);
  const percentHundredths = Math.round(miriamPercent * 100);
  const miriamCents = Math.round((totalCents * percentHundredths) / 10_000);
  return {
    miriamAmount: miriamCents / 100,
    // Give the remaining cents to Simon so the shares always sum to the bill.
    simonAmount: (totalCents - miriamCents) / 100,
  };
}

export function isExpenseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000"))
    return false;
  const parsed = new Date(value);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function toField(value: number) {
  return String(value).replace(".", ",");
}
