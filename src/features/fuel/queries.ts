import "server-only";

import { desc } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { isOffsetMode } from "./calculate";
import type { FuelFillUpEntry } from "./types";

/** The whole history is loaded and paged client-side; ~20 years of fill-ups. */
const HISTORY_LIMIT = 500;

export async function getFuelFillUps(): Promise<FuelFillUpEntry[]> {
  const rows = await getDb()
    .select()
    .from(schema.fuelFillUps)
    // Newest first, and `createdAt` breaks ties so two fill-ups entered on the
    // same day keep the order they were entered in.
    .orderBy(
      desc(schema.fuelFillUps.filledOn),
      desc(schema.fuelFillUps.createdAt),
    )
    // One over the limit: the extra row is never rendered, it only tells us the
    // history has outgrown what the page loads. Without it the oldest fill-ups
    // would drop off the end silently.
    .limit(HISTORY_LIMIT + 1);

  if (rows.length > HISTORY_LIMIT) {
    console.warn(
      `getFuelFillUps: more than ${HISTORY_LIMIT} fill-ups stored; the history is truncated. Raise HISTORY_LIMIT or page on the server.`,
    );
  }

  return rows.slice(0, HISTORY_LIMIT).map((row) => ({
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
