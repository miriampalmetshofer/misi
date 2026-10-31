import "server-only";

import { desc } from "drizzle-orm";

import { getDb, schema } from "@/db";
import type { CarExpenseEntry } from "./expense";

export async function getCarExpenses(): Promise<CarExpenseEntry[]> {
  const { carExpenses } = schema;
  return getDb()
    .select({
      id: carExpenses.id,
      spentOn: carExpenses.spentOn,
      description: carExpenses.description,
      totalAmount: carExpenses.totalAmount,
      miriamPercent: carExpenses.miriamPercent,
      miriamAmount: carExpenses.miriamAmount,
      simonAmount: carExpenses.simonAmount,
      note: carExpenses.note,
    })
    .from(carExpenses)
    .orderBy(
      desc(carExpenses.spentOn),
      desc(carExpenses.createdAt),
    );
}
