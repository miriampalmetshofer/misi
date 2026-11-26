import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import type { Product } from "@/features/grocery/product";

export const groceryCategories = pgTable(
  "grocery_category",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("📦"),
    sortOrder: integer("sort_order").notNull().default(0),
    quickAddItems: text("quick_add_items").array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("grocery_category_name_unique").on(table.name)],
);

export const groceryItems = pgTable(
  "grocery_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id").references(() => groceryCategories.id, {
      onDelete: "set null",
    }),
    listId: text("list_id", { enum: ["groceries", "dm", "obi"] }).notNull().default("groceries"),
    name: varchar("name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    isChecked: boolean("is_checked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("grocery_item_list_valid", sql`${table.listId} = 'groceries' or (${table.listId} in ('dm', 'obi') and ${table.categoryId} is null)`),
    index("grocery_item_category_idx").on(table.categoryId),
    index("grocery_item_checked_idx").on(table.isChecked),
    check("grocery_item_quantity_valid", sql`${table.quantity} between 1 and 999999999`),
  ],
);

export const groceryCategoryPreferences = pgTable("grocery_category_preference", {
  normalizedName: text("normalized_name").primaryKey(),
  categoryId: uuid("category_id").notNull().references(() => groceryCategories.id, {
    onDelete: "cascade",
  }),
});

export const groceryStorePreferences = pgTable("grocery_store_preference", {
  normalizedName: text("normalized_name").primaryKey(),
  stores: text("stores").array().notNull(),
});

export const groceryCategoriesRelations = relations(
  groceryCategories,
  ({ many }) => ({
    groceryItems: many(groceryItems),
  }),
);

export const groceryItemsRelations = relations(groceryItems, ({ one }) => ({
  category: one(groceryCategories, {
    fields: [groceryItems.categoryId],
    references: [groceryCategories.id],
  }),
}));

export type GroceryCategory = typeof groceryCategories.$inferSelect;
export type NewGroceryCategory = typeof groceryCategories.$inferInsert;
export type GroceryItem = typeof groceryItems.$inferSelect;
export type NewGroceryItem = typeof groceryItems.$inferInsert;

/** Kilometres: generous headroom, one decimal is all the readings ever carry. */
const kilometres = (name: string) =>
  numeric(name, { precision: 10, scale: 1, mode: "number" });

/** Euros. Exact decimal, because a settled bill must not drift in binary float. */
const euros = (name: string) =>
  numeric(name, { precision: 10, scale: 2, mode: "number" });

export const fuelFillUps = pgTable(
  "fuel_fill_up",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The day of the fill-up, as picked in the form — a plain calendar date. */
    filledOn: date("filled_on").notNull(),

    // Inputs, kept so a stored fill-up stays explainable rather than being a
    // bare pair of euro amounts.
    miriamKm: kilometres("miriam_km").notNull(),
    simonKm: kilometres("simon_km").notNull(),
    sharedKm: kilometres("shared_km").notNull(),
    carKm: kilometres("car_km").notNull(),
    paidAmount: euros("paid_amount").notNull(),
    /** Which rule split the device/car gap: "proportional" or "shared". */
    offsetMode: text("offset_mode").notNull(),

    // Outputs. Redundant against the inputs on purpose: a fill-up is settled
    // money, so it has to keep the numbers that were actually agreed even if
    // the calculation rules change later.
    miriamAmount: euros("miriam_amount").notNull(),
    simonAmount: euros("simon_amount").notNull(),

    // NULL marks auto costs already settled before the Quitt integration.
    paidBy: text("paid_by").$type<"miriam" | "simon">(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("fuel_fill_up_filled_on_idx").on(table.filledOn),
    check("fuel_fill_up_payer_valid", sql`${table.paidBy} in ('miriam', 'simon')`),
  ],
);

export type FuelFillUp = typeof fuelFillUps.$inferSelect;
export type NewFuelFillUp = typeof fuelFillUps.$inferInsert;

export const carExpenses = pgTable(
  "car_expense",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    version: integer("version").notNull().default(1),
    spentOn: date("spent_on").notNull(),
    description: varchar("description", { length: 200 }).notNull(),
    totalAmount: euros("total_amount").notNull(),
    miriamPercent: numeric("miriam_percent", {
      precision: 5,
      scale: 2,
      mode: "number",
    }).notNull(),
    miriamAmount: euros("miriam_amount").notNull(),
    simonAmount: euros("simon_amount").notNull(),
    note: varchar("note", { length: 2000 }).notNull().default(""),
    // NULL marks auto costs already settled before the Quitt integration.
    paidBy: text("paid_by").$type<"miriam" | "simon">(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("car_expense_spent_on_idx").on(table.spentOn),
    check("car_expense_payer_valid", sql`${table.paidBy} in ('miriam', 'simon')`),
    check("car_expense_positive_total", sql`${table.totalAmount} > 0`),
    check(
      "car_expense_percent_range",
      sql`${table.miriamPercent} between 0 and 100`,
    ),
    check(
      "car_expense_amounts_match",
      sql`${table.miriamAmount} >= 0 and ${table.simonAmount} >= 0 and ${table.miriamAmount} + ${table.simonAmount} = ${table.totalAmount}`,
    ),
  ],
);

export type CarExpense = typeof carExpenses.$inferSelect;

export const recipes = pgTable("meal_product_list", {
  dishKey: text("dish_key").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  version: integer("version").notNull().default(1),
  products: jsonb("products").$type<Product[]>().notNull(),
});

export const mealEntries = pgTable(
  "meal_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plannedOn: date("planned_on").notNull(),
    version: integer("version").notNull().default(1),
    mealTime: text("meal_time").$type<"lunch" | "dinner">().notNull(),
    person: text("person")
      .$type<"both" | "miriam" | "simon">()
      .notNull()
      .default("both"),
    name: varchar("name", { length: 200 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("meal_entry_planned_on_idx").on(table.plannedOn),
    check("meal_entry_time_valid", sql`${table.mealTime} in ('lunch', 'dinner')`),
    check(
      "meal_entry_person_valid",
      sql`${table.person} in ('both', 'miriam', 'simon')`,
    ),
    check("meal_entry_name_not_empty", sql`length(trim(${table.name})) > 0`),
  ],
);

export const quittEntries = pgTable(
  "quitt_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    version: integer("version").notNull().default(1),
    kind: text("kind").$type<"expense" | "payment">().notNull(),
    description: varchar("description", { length: 200 }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    paidBy: text("paid_by").$type<"miriam" | "simon">().notNull(),
    forWhom: text("for_whom").$type<"miriam" | "simon" | "both">().notNull(),
    occurredOn: date("occurred_on").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "quitt_positive_amount",
      sql`${table.amountCents} > 0 and ${table.amountCents} <= 999999999`,
    ),
    check("quitt_kind_valid", sql`${table.kind} in ('expense', 'payment')`),
    check("quitt_payer_valid", sql`${table.paidBy} in ('miriam', 'simon')`),
    check(
      "quitt_beneficiary_valid",
      sql`${table.forWhom} in ('miriam', 'simon', 'both')`,
    ),
    check(
      "quitt_payment_recipient",
      sql`${table.kind} != 'payment' or (${table.forWhom} != 'both' and ${table.forWhom} != ${table.paidBy})`,
    ),
    check(
      "quitt_description_not_empty",
      sql`length(trim(${table.description})) > 0`,
    ),
  ],
);
