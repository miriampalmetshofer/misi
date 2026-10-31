import "server-only";

import { desc } from "drizzle-orm";

import { getDb, schema } from "@/db";
import type { CarExpenseEntry } from "./expense";

export async function getCarExpenses(): Promise<CarExpenseEntry[]> {
  const rows = await getDb()
    .select()
    .from(schema.carExpenses)
    .orderBy(
      desc(schema.carExpenses.spentOn),
      desc(schema.carExpenses.createdAt),
    );
  return rows.map(
    ({
      id,
      spentOn,
      description,
      totalAmount,
      miriamPercent,
      miriamAmount,
      simonAmount,
      note,
    }) => ({
      id,
      spentOn,
      description,
      totalAmount,
      miriamPercent,
      miriamAmount,
      simonAmount,
      note,
    }),
  );
}
