"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { isPerson, parseCents, validDate } from "./types";

const table = schema.quittEntries;
const validId = (id: string) =>
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
const validVersion = (v: number) =>
  Number.isInteger(v) && v > 0 && v < 2147483647;
const conflict =
  "Dieser Eintrag wurde inzwischen geändert oder gelöscht. Bitte lade die Seite neu. Deine Eingaben bleiben bis dahin erhalten.";

export async function saveQuittEntry(form: FormData) {
  const read = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const id = read("id");
  const version = Number(read("version"));
  const kind = read("kind");
  const description = read("description");
  const amountCents = parseCents(read("amount"));
  const paidBy = read("paidBy");
  const forWhom =
    kind === "payment"
      ? paidBy === "miriam"
        ? "simon"
        : "miriam"
      : read("forWhom");
  const occurredOn = read("occurredOn");
  if (
    (id && (!validId(id) || !validVersion(version))) ||
    (kind !== "expense" && kind !== "payment") ||
    !description ||
    description.length > 200 ||
    amountCents === null ||
    !isPerson(paidBy) ||
    (!isPerson(forWhom) && forWhom !== "both") ||
    !validDate(occurredOn)
  ) {
    return { error: "Bitte Beschreibung, Betrag, Personen und Datum prüfen." };
  }
  const values: typeof table.$inferInsert = {
    kind,
    description,
    amountCents,
    paidBy,
    forWhom,
    occurredOn,
  };
  try {
    if (id) {
      const rows = await getDb()
        .update(table)
        .set({
          ...values,
          version: sql`${table.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(table.id, id), eq(table.version, version)))
        .returning({ id: table.id });
      if (!rows.length) return { error: conflict };
    } else {
      await getDb().insert(table).values(values);
    }
  } catch {
    return {
      error:
        "Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten. Bitte erneut versuchen.",
    };
  }
  revalidatePath("/quitt");
  return { error: null };
}

export async function deleteQuittEntry(id: string, version: number) {
  if (!validId(id) || !validVersion(version))
    return { error: "Ungültiger Eintrag." };
  try {
    const rows = await getDb()
      .delete(table)
      .where(and(eq(table.id, id), eq(table.version, version)))
      .returning({ id: table.id });
    if (!rows.length) return { error: conflict };
  } catch {
    return { error: "Löschen fehlgeschlagen. Bitte erneut versuchen." };
  }
  revalidatePath("/quitt");
  return { error: null };
}
