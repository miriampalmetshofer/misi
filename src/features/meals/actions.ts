"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb, schema } from "@/db";
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
