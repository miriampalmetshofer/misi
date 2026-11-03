import { expect, test } from "@playwright/test";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

import { normalizeItemName } from "../src/features/grocery/categories";
import { normalizeItemNameSql } from "../src/features/grocery/itemNameSql";

test("SQL and client category-memory keys agree on grocery names and whitespace", async () => {
  const uri = process.env.E2E_DATABASE_URL;
  if (!uri) throw new Error("The disposable e2e database URL is required.");
  const db = drizzle(neon(uri));
  for (const name of [
    "Tomate", "  ROTE   Tomaten  ", "\tHafer\nMilch\r\n", "\vEier\f",
    "ÄPFEL", "Öl", "SÜẞKARTOFFELN", "Crème fraîche", "", "   ",
  ]) {
    const { rows: [row] } = await db.execute<{ normalizedName: string }>(
      sql`select ${normalizeItemNameSql(sql`${name}`)} as "normalizedName"`,
    );
    expect(row.normalizedName, JSON.stringify(name)).toBe(normalizeItemName(name));
  }
});
