import "server-only";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { QuittEntry } from "./types";

export async function getQuittEntries(): Promise<QuittEntry[]> {
  return getDb()
    .select()
    .from(schema.quittEntries)
    .orderBy(
      desc(schema.quittEntries.occurredOn),
      desc(schema.quittEntries.createdAt),
      desc(schema.quittEntries.id),
    );
}
