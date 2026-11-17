import "server-only";
import { isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { AutoQuittEntry, QuittHistoryEntry } from "./types";

export async function getQuittEntries(): Promise<QuittHistoryEntry[]> {
  const db = getDb();
  const [manual, fuel, car] = await Promise.all([
    db.select().from(schema.quittEntries),
    db.select()
      .from(schema.fuelFillUps)
      .where(isNotNull(schema.fuelFillUps.paidBy)),
    db.select()
      .from(schema.carExpenses)
      .where(isNotNull(schema.carExpenses.paidBy)),
  ]);
  const autoEntries = [
    ...fuel.map((row) => ({
      ...row,
      source: "fuel" as const,
      description: "Tanken",
      totalAmount: row.paidAmount,
      occurredOn: row.filledOn,
    })),
    ...car.map((row) => ({
      ...row,
      source: "car" as const,
      occurredOn: row.spentOn,
    })),
  ].flatMap((row): (AutoQuittEntry & { createdAt: Date })[] =>
    row.paidBy === null ? [] : [{
      source: row.source,
      id: row.id,
      kind: "expense",
      description: row.description,
      amountCents: Math.round(row.totalAmount * 100),
      paidBy: row.paidBy,
      miriamAmountCents: Math.round(row.miriamAmount * 100),
      simonAmountCents: Math.round(row.simonAmount * 100),
      occurredOn: row.occurredOn,
      createdAt: row.createdAt,
    }],
  );
  return [...manual, ...autoEntries].sort((a, b) =>
    b.occurredOn.localeCompare(a.occurredOn) ||
    b.createdAt.getTime() - a.createdAt.getTime() ||
    b.id.localeCompare(a.id),
  );
}
