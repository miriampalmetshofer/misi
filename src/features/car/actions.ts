"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb, schema } from "@/db";
import { isExpenseDate, parseDecimal, splitExpense } from "./expense";

const validId = (id: string) =>
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);

export async function saveCarExpense(form: FormData) {
  const read = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const id = read("id");
  const spentOn = read("spentOn");
  const description = read("description");
  const note = read("note");
  const totalAmount = parseDecimal(read("totalAmount"), 100_000);
  const miriamPercent = parseDecimal(read("miriamPercent"), 100);

  if (
    (id && !validId(id)) ||
    !isExpenseDate(spentOn) ||
    !description ||
    description.length > 200 ||
    note.length > 2000 ||
    totalAmount === null ||
    totalAmount <= 0 ||
    miriamPercent === null
  ) {
    return {
      error: "Bitte Datum, Beschreibung, Betrag und Aufteilung prüfen.",
    };
  }

  const values = {
    spentOn,
    description,
    note,
    totalAmount,
    miriamPercent,
    ...splitExpense(totalAmount, miriamPercent),
  };

  try {
    if (id) {
      const rows = await getDb()
        .update(schema.carExpenses)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(schema.carExpenses.id, id))
        .returning({ id: schema.carExpenses.id });
      if (!rows.length)
        return {
          error:
            "Dieser Eintrag existiert nicht mehr. Bitte die Seite neu laden.",
        };
    } else {
      await getDb().insert(schema.carExpenses).values(values);
    }
  } catch (error) {
    logExpenseFailure("saveCarExpense", error);
    return {
      error:
        "Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten. Bitte erneut versuchen.",
    };
  }
  revalidatePath("/auto");
  return { error: null };
}

export async function deleteCarExpense(id: string) {
  if (!validId(id)) return { error: "Ungültiger Eintrag." };
  try {
    await getDb()
      .delete(schema.carExpenses)
      .where(eq(schema.carExpenses.id, id));
  } catch (error) {
    logExpenseFailure("deleteCarExpense", error);
    return { error: "Löschen fehlgeschlagen. Bitte erneut versuchen." };
  }
  revalidatePath("/auto");
  return { error: null };
}

function logExpenseFailure(operation: string, error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined;
  const databaseError = cause ?? error;
  const code =
    databaseError &&
    typeof databaseError === "object" &&
    "code" in databaseError
      ? databaseError.code
      : undefined;

  // Drizzle errors contain SQL and parameters; log only a category and SQLSTATE.
  console.error(operation, {
    type:
      databaseError instanceof TypeError
        ? "TypeError"
        : databaseError instanceof Error
          ? "Error"
          : "UnknownError",
    ...(typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? { code } : {}),
  });
}
