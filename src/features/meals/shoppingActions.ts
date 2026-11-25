"use server";

import { revalidatePath } from "next/cache";
import { sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { normalizeItemName } from "@/features/grocery/categories";
import { normalizeItemNameSql } from "@/features/grocery/itemNameSql";
import { validProduct } from "@/features/grocery/product";
import { productsForDish, type ShoppingReviewRow } from "./products";
import { getDishProducts, getWeekMeals } from "./queries";
import { isMealDate } from "./types";

export async function prepareMealShopping(
  start: string,
): Promise<ShoppingReviewRow[]> {
  if (!isMealDate(start)) throw new Error("Ungültige Woche.");
  const [entries, dishes] = await Promise.all([
    getWeekMeals(start),
    getDishProducts(),
  ]);
  const products = entries.flatMap((entry) =>
    productsForDish(dishes, normalizeItemName(entry.name)),
  );
  if (!products.length) return [];

  const result = await getDb().execute<{
    name: string;
    quantity: string;
    id: string | null;
    current_quantity: number | null;
  }>(sql`
    with planned as (
      select min(name) as name, sum(quantity) as quantity,
        ${normalizeItemNameSql(sql`name`)} as product_key
      from jsonb_to_recordset(${JSON.stringify(products)}::jsonb)
        as product(name text, quantity integer)
      group by product_key
    )
    select planned.name, planned.quantity, current_item.id,
      current_item.quantity as current_quantity
    from planned
    ${matchOpenItem(sql`planned.product_key`)}
  `);
  return result.rows
    .map(({ name, quantity, id, current_quantity }) => ({
      name,
      quantity: Number(quantity),
      existing:
        id !== null && current_quantity !== null
          ? { id, quantity: current_quantity }
          : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de-AT"));
}

function matchOpenItem(key: SQL) {
  return sql`left join lateral (
    select id, quantity from ${schema.groceryItems}
    where not is_checked and ${normalizeItemNameSql(sql`name`)} = ${key}
    order by created_at, id limit 1
  ) as current_item on true`;
}

export async function applyMealShopping(rows: ShoppingReviewRow[]) {
  if (!rows.length) return { error: "Bitte wähle mindestens ein Produkt aus." };
  if (!rows.every(validProduct))
    return { error: "Bitte Produkte und Stückzahlen prüfen." };

  const db = getDb();
  const items = schema.groceryItems;
  const preferences = schema.groceryCategoryPreferences;
  const payload = rows.map(({ name, quantity, existing }) => ({
    name,
    quantity,
    expected_id: existing?.id ?? null,
    expected_quantity: existing?.quantity ?? null,
  }));
  try {
    // Keep matching and writing atomic, including against manual grocery edits.
    const [, result] = await db.batch([
      db.execute(sql`lock table ${items} in share row exclusive mode`),
      db.execute(sql`
        with reviewed as (
          select incoming.*, ${normalizeItemNameSql(sql`incoming.name`)} as product_key
          from jsonb_to_recordset(${JSON.stringify(payload)}::jsonb)
            as incoming(name text, quantity integer, expected_id uuid, expected_quantity integer)
        ), matched as (
          select reviewed.*, current_item.id, current_item.quantity as current_quantity
          from reviewed
          ${matchOpenItem(sql`reviewed.product_key`)}
        ), eligible as (
          select * from matched
          where not exists (
            select 1 from matched
            where id is distinct from expected_id or current_quantity is distinct from expected_quantity
          ) and not exists (
            select product_key from reviewed group by product_key having count(*) > 1
          )
        ), updated as (
          update ${items} as item
          set quantity = eligible.quantity, updated_at = now()
          from eligible where item.id = eligible.id
          returning item.id
        ), added as (
          insert into ${items} (name, quantity, category_id)
          select eligible.name, eligible.quantity, preference.category_id
          from eligible
          left join ${preferences} as preference on preference.normalized_name = eligible.product_key
          where eligible.id is null
          returning id
        )
        select count(*)::integer as written from (
          select id from updated union all select id from added
        ) as changes
      `),
    ]);
    if (result.rows[0]?.written !== rows.length) {
      return {
        error:
          "Die Einkaufsliste wurde inzwischen geändert. Bitte lade die Vorschau neu.",
        stale: true,
      };
    }
    revalidatePath("/einkauf");
    return { error: null };
  } catch {
    return { error: "Übernehmen fehlgeschlagen. Bitte erneut versuchen." };
  }
}
