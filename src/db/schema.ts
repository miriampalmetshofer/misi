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
