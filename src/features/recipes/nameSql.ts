import { sql, type SQLWrapper } from "drizzle-orm";
import { normalizeItemNameSql } from "@/features/grocery/itemNameSql";

// ICU uses the same Unicode case mapping as the planner's de-AT name matching.
export function normalizeRecipeNameSql(name: SQLWrapper) {
  return normalizeItemNameSql(sql`${name} collate pg_catalog."de-x-icu"`);
}
