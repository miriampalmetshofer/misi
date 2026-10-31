"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb, schema } from "@/db";

export async function setPaymentSettled(
  kind: "fuel" | "expense",
  id: string,
  isSettled: boolean,
) {
  if (
    (kind !== "fuel" && kind !== "expense") ||
    typeof id !== "string" ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) ||
    typeof isSettled !== "boolean"
  ) {
    return { error: "Ungültiger Zahlungsstatus." };
  }

  const table = kind === "fuel" ? schema.fuelFillUps : schema.carExpenses;
  try {
    const rows = await getDb()
      .update(table)
      .set({ isSettled, updatedAt: new Date() })
      .where(eq(table.id, id))
      .returning({ id: table.id });
    if (!rows.length) {
      return {
        error:
          "Dieser Eintrag existiert nicht mehr. Bitte die Seite neu laden.",
      };
    }
  } catch {
    console.error("setPaymentSettled: database update failed");
    return {
      error:
        "Zahlungsstatus konnte nicht gespeichert werden. Bitte erneut versuchen.",
    };
  }

  revalidatePath("/auto");
  return { error: null };
}
