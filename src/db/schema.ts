import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const groceryCategories = pgTable(
  "grocery_category",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("📦"),
    sortOrder: integer("sort_order").notNull().default(0),
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
    name: varchar("name").notNull(),
    isChecked: boolean("is_checked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("grocery_item_category_idx").on(table.categoryId),
    index("grocery_item_checked_idx").on(table.isChecked),
  ],
);

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

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("fuel_fill_up_filled_on_idx").on(table.filledOn)],
);

export type FuelFillUp = typeof fuelFillUps.$inferSelect;
export type NewFuelFillUp = typeof fuelFillUps.$inferInsert;
