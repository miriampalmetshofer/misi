"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { normalizeItemName } from "@/features/grocery/categories";
import { normalizeRecipeNameSql } from "./nameSql";
import { parseDishProducts } from "./types";

export async function saveRecipe(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const oldKey = String(form.get("dishKey") ?? "");
  const version = Number(form.get("version"));
  const products = parseDishProducts(form);
  if (!name || name.length > 200)
    return { error: "Bitte einen Rezeptnamen eingeben." };
  if (!products)
    return {
      error: "Bitte höchstens 30 Zutaten mit gültiger Stückzahl eingeben.",
    };
  if (
    oldKey &&
    (!Number.isInteger(version) || version <= 0 || version >= 2147483647)
  ) {
    return { error: "Bitte die Seite neu laden und erneut versuchen." };
  }

  const db = getDb();
  const recipes = schema.recipes;
  const meals = schema.mealEntries;
  const dishKey = normalizeItemName(name);
  try {
    if (oldKey) {
      const { rows } = await db.execute(sql`
        with saved as (
          update ${recipes}
          set dish_key = ${dishKey}, name = ${name}, products = ${JSON.stringify(products)}::jsonb, version = version + 1
          where dish_key = ${oldKey} and version = ${version}
          returning dish_key, name
        ), renamed_meals as (
          update ${meals}
          set name = saved.name, version = ${meals.version} + 1, updated_at = now()
          from saved
          where ${oldKey} <> saved.dish_key and ${normalizeRecipeNameSql(meals.name)} = ${oldKey}
        )
        select dish_key from saved
      `);
      if (!rows.length) {
        return {
          error:
            "Das Rezept wurde inzwischen geändert. Bitte lade die Seite neu und prüfe deine Eingaben.",
        };
      }
    } else {
      const added = await db
        .insert(recipes)
        .values({ dishKey, name, products })
        .onConflictDoNothing()
        .returning({ dishKey: recipes.dishKey });
      if (!added.length)
        return { error: "Ein Rezept mit diesem Namen ist bereits vorhanden." };
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.cause as { code?: string } | undefined)?.code === "23505"
    ) {
      return { error: "Ein Rezept mit diesem Namen ist bereits vorhanden." };
    }
    return {
      error: "Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten.",
    };
  }
  revalidatePath("/speiseplan/rezepte");
  revalidatePath("/speiseplan");
  return { error: null };
}
