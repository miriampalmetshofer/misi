"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb, schema } from "@/db";
import { isMealDate, type MealEntry } from "./types";

const validId = (id: string) =>
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);

export async function saveMeal(form: FormData) {
  const read = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const id = read("id");
  const plannedOn = read("plannedOn");
  const mealTime = read("mealTime");
  const person = read("person");
  const name = read("name");
  if (
    (id && !validId(id)) ||
    !isMealDate(plannedOn) ||
    (mealTime !== "lunch" && mealTime !== "dinner") ||
    (person !== "both" && person !== "miriam" && person !== "simon") ||
    !name ||
    name.length > 200
  ) {
    return { error: "Bitte Gericht, Datum, Mahlzeit und Person prüfen." };
  }
  const values: Omit<MealEntry, "id"> = { plannedOn, mealTime, person, name };
  try {
    if (id) {
      const rows = await getDb()
        .update(schema.mealEntries)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(schema.mealEntries.id, id))
        .returning({ id: schema.mealEntries.id });
      if (!rows.length)
        return {
          error:
            "Dieser Eintrag existiert nicht mehr. Bitte die Seite neu laden.",
        };
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

export async function deleteMeal(id: string) {
  if (!validId(id)) return { error: "Ungültiger Eintrag." };
  try {
    await getDb()
      .delete(schema.mealEntries)
      .where(eq(schema.mealEntries.id, id));
  } catch {
    return { error: "Löschen fehlgeschlagen. Bitte erneut versuchen." };
  }
  revalidatePath("/speiseplan");
  return { error: null };
}
