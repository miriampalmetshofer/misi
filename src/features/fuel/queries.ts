import "server-only";

import { desc } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { isOffsetMode } from "./calculate";
import type { FuelFillUpEntry } from "./types";

/** How many past fill-ups the page shows. Enough to cover a long while. */
const HISTORY_LIMIT = 50;

export async function getFuelFillUps(): Promise<FuelFillUpEntry[]> {
  const rows = await getDb()
    .select()
    .from(schema.fuelFillUps)
    // Newest first, and `createdAt` breaks ties so two fill-ups entered on the
    // same day keep the order they were entered in.
    .orderBy(desc(schema.fuelFillUps.filledOn), desc(schema.fuelFillUps.createdAt))
    .limit(HISTORY_LIMIT);

  return rows.map((row) => ({
    id: row.id,
    filledOn: row.filledOn,
    miriamKm: row.miriamKm,
    simonKm: row.simonKm,
    sharedKm: row.sharedKm,
    carKm: row.carKm,
    paidAmount: row.paidAmount,
    // The column is plain text, so a row written by anything other than this
    // app could hold something else. Fall back rather than lie about the mode.
    offsetMode: isOffsetMode(row.offsetMode) ? row.offsetMode : "proportional",
    miriamAmount: row.miriamAmount,
    simonAmount: row.simonAmount,
  }));
}
