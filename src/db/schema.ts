import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const groceryCategories = pgTable(
  "grocery_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
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
  (table) => [
    index("grocery_categories_household_idx").on(table.householdId),
    uniqueIndex("grocery_categories_household_name_unique").on(
      table.householdId,
      table.name,
    ),
  ],
);

export const groceryItems = pgTable(
  "grocery_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => groceryCategories.id, {
      onDelete: "set null",
    }),
    name: varchar("name").notNull(),
    normalizedName: varchar("normalized_name").notNull(),
    quantity: varchar("quantity").notNull().default("1"),
    isChecked: boolean("is_checked").notNull().default(false),
    completedCount: integer("completed_count").notNull().default(0),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("grocery_items_household_idx").on(table.householdId),
    index("grocery_items_category_idx").on(table.categoryId),
    index("grocery_items_checked_idx").on(table.isChecked),
    uniqueIndex("grocery_items_household_normalized_name_unique").on(
      table.householdId,
      table.normalizedName,
    ),
  ],
);

export const groceryItemCategoryPreferences = pgTable(
  "grocery_item_category_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => groceryCategories.id, { onDelete: "cascade" }),
    normalizedItemName: text("normalized_item_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("grocery_preferences_household_idx").on(table.householdId),
    index("grocery_preferences_category_idx").on(table.categoryId),
    uniqueIndex("grocery_preferences_household_item_unique").on(
      table.householdId,
      table.normalizedItemName,
    ),
  ],
);

export const householdsRelations = relations(households, ({ many }) => ({
  groceryCategories: many(groceryCategories),
  groceryItems: many(groceryItems),
  groceryItemCategoryPreferences: many(groceryItemCategoryPreferences),
}));

export const groceryCategoriesRelations = relations(
  groceryCategories,
  ({ many, one }) => ({
    household: one(households, {
      fields: [groceryCategories.householdId],
      references: [households.id],
    }),
    groceryItems: many(groceryItems),
    groceryItemCategoryPreferences: many(groceryItemCategoryPreferences),
  }),
);

export const groceryItemsRelations = relations(groceryItems, ({ one }) => ({
  household: one(households, {
    fields: [groceryItems.householdId],
    references: [households.id],
  }),
  category: one(groceryCategories, {
    fields: [groceryItems.categoryId],
    references: [groceryCategories.id],
  }),
}));

export const groceryItemCategoryPreferencesRelations = relations(
  groceryItemCategoryPreferences,
  ({ one }) => ({
    household: one(households, {
      fields: [groceryItemCategoryPreferences.householdId],
      references: [households.id],
    }),
    category: one(groceryCategories, {
      fields: [groceryItemCategoryPreferences.categoryId],
      references: [groceryCategories.id],
    }),
  }),
);

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
export type GroceryCategory = typeof groceryCategories.$inferSelect;
export type NewGroceryCategory = typeof groceryCategories.$inferInsert;
export type GroceryItem = typeof groceryItems.$inferSelect;
export type NewGroceryItem = typeof groceryItems.$inferInsert;
export type GroceryItemCategoryPreference =
  typeof groceryItemCategoryPreferences.$inferSelect;
export type NewGroceryItemCategoryPreference =
  typeof groceryItemCategoryPreferences.$inferInsert;
