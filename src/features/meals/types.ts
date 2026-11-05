import { addDays, format, parseISO, startOfWeek } from "date-fns";

export const mealLabels = { lunch: "Mittag", dinner: "Abend" } as const;
export const personLabels = {
  both: "Beide",
  miriam: "Miriam",
  simon: "Simon",
} as const;
export type MealTime = keyof typeof mealLabels;
export type MealPerson = keyof typeof personLabels;
export type MealEntry = {
  id: string;
  plannedOn: string;
  mealTime: MealTime;
  person: MealPerson;
  name: string;
};

export function isMealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000"))
    return false;
  const date = parseISO(value);
  return !Number.isNaN(date.getTime()) && format(date, "yyyy-MM-dd") === value;
}

export function weekStart(value: string) {
  return format(
    startOfWeek(parseISO(value), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
}

export function shiftDate(value: string, days: number) {
  return format(addDays(parseISO(value), days), "yyyy-MM-dd");
}

export function householdToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
