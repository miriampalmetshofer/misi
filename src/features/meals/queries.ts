import "server-only";

import { and, asc, gte, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { shiftDate, type MealEntry } from "./types";

export async function getWeekMeals(start: string): Promise<MealEntry[]> {
  const { mealEntries: table } = schema;
  return getDb()
    .select({
      id: table.id,
      version: table.version,
      plannedOn: table.plannedOn,
      mealTime: table.mealTime,
      person: table.person,
      name: table.name,
    })
    .from(table)
    .where(
      and(
        gte(table.plannedOn, start),
        lt(table.plannedOn, shiftDate(start, 7)),
      ),
    )
    .orderBy(asc(table.createdAt), asc(table.id));
}
