import "server-only";

import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Recipe } from "./types";

export async function getRecipes(): Promise<Recipe[]> {
  const table = schema.recipes;
  return getDb().select().from(table).orderBy(asc(table.dishKey));
}

export async function getRecipeNames() {
  const table = schema.recipes;
  return getDb()
    .select({ dishKey: table.dishKey, name: table.name })
    .from(table)
    .orderBy(asc(table.dishKey));
}
