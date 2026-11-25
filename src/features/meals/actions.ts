"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb, schema } from "@/db";
import { normalizeItemName } from "@/features/grocery/categories";
import type { Product } from "@/features/grocery/product";
import { parseDishProducts } from "./products";
import { isMealDate, type MealEntry } from "./types";

const validId = (id: string) =>
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
const validVersion = (version: number) =>
  Number.isInteger(version) && version > 0 && version < 2147483647;
const conflictMessage =
  "Dieser Eintrag wurde inzwischen geändert oder gelöscht. Deine Eingaben bleiben erhalten. Bitte schließe das Fenster und lade die Seite neu.";

export async function saveMeal(form: FormData) {
  const read = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const id = read("id");
  const version = Number(read("version"));
  const plannedOn = read("plannedOn");
  const mealTime = read("mealTime");
  const person = read("person");
  const name = read("name");
  if (
    (id && (!validId(id) || !validVersion(version))) ||
    !isMealDate(plannedOn) ||
    (mealTime !== "lunch" && mealTime !== "dinner") ||
    (person !== "both" && person !== "miriam" && person !== "simon") ||
    !name ||
    name.length > 200
  ) {
    return { error: "Bitte Gericht, Datum, Mahlzeit und Person prüfen." };
  }
  const values: Omit<MealEntry, "id" | "version"> = {
    plannedOn,
    mealTime,
    person,
    name,
  };
  try {
    if (form.has("products")) {
      const products = parseDishProducts(read("products"));
      const original = parseDishProducts(read("originalProducts"));
      if (!products || !original) {
        return {
          error: "Bitte höchstens 30 Produkte mit gültiger Stückzahl eingeben.",
        };
      }
      if (JSON.stringify(products) !== JSON.stringify(original)) {
        const saved = await saveMealWithProducts(
          values,
          id,
          version,
          products,
          original,
        );
        if (!saved) return { error: conflictMessage };
        revalidatePath("/speiseplan");
        return { error: null };
      }
    }
    if (id) {
      const rows = await getDb()
        .update(schema.mealEntries)
        .set({
          ...values,
          version: sql`${schema.mealEntries.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.mealEntries.id, id),
            eq(schema.mealEntries.version, version),
          ),
        )
        .returning({ id: schema.mealEntries.id });
      if (!rows.length) return { error: conflictMessage };
    } else {
      await getDb().insert(schema.mealEntries).values(values);
    }
  } catch {
    return {
      error:
        "Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten. Bitte erneut versuchen.",
    };
  }
  revalidatePath("/speiseplan");
  return { error: null };
}

export async function deleteMeal(id: string, version: number) {
  if (!validId(id) || !validVersion(version))
    return { error: "Ungültiger Eintrag." };
  try {
    const rows = await getDb()
      .delete(schema.mealEntries)
      .where(
        and(
          eq(schema.mealEntries.id, id),
          eq(schema.mealEntries.version, version),
        ),
      )
      .returning({ id: schema.mealEntries.id });
    if (!rows.length) return { error: conflictMessage };
  } catch {
    return { error: "Löschen fehlgeschlagen. Bitte erneut versuchen." };
  }
  revalidatePath("/speiseplan");
  return { error: null };
}

async function saveMealWithProducts(
  { name, mealTime, person, plannedOn }: Omit<MealEntry, "id" | "version">,
  id: string,
  version: number,
  products: Product[],
  original: Product[],
) {
  const db = getDb();
  const meals = schema.mealEntries;
  const lists = schema.mealProducts;
  const key = normalizeItemName(name);
  const mutation = id
    ? sql`update ${meals} set name = ${name}, meal_time = ${mealTime},
        person = ${person}, planned_on = ${plannedOn}, version = version + 1,
        updated_at = now()
        where id = ${id} and version = ${version} and exists (select 1 from unchanged)
        returning id`
    : sql`insert into ${meals} (name, meal_time, person, planned_on)
        select ${name}, ${mealTime}, ${person}, ${plannedOn}::date from unchanged
        returning id`;

  // Serialize template edits while checking the version of the shared product list.
  const [, result] = await db.batch([
    db.execute(sql`lock table ${lists} in share row exclusive mode`),
    db.execute(sql`
      with unchanged as (
        select 1 where coalesce(
          (select products from ${lists} where dish_key = ${key}), '[]'::jsonb
        ) = ${JSON.stringify(original)}::jsonb
      ), saved as (${mutation})
      insert into ${lists} (dish_key, products)
      select ${key}, ${JSON.stringify(products)}::jsonb from saved
      on conflict (dish_key) do update set products = excluded.products
      returning dish_key
    `),
  ]);
  return result.rows.length === 1;
}
