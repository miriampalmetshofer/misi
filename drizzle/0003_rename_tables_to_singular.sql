ALTER TABLE "households" RENAME TO "household";--> statement-breakpoint
ALTER TABLE "grocery_categories" RENAME TO "grocery_category";--> statement-breakpoint
ALTER TABLE "grocery_items" RENAME TO "grocery_item";--> statement-breakpoint
ALTER INDEX "grocery_categories_household_idx" RENAME TO "grocery_category_household_idx";--> statement-breakpoint
ALTER INDEX "grocery_categories_household_name_unique" RENAME TO "grocery_category_household_name_unique";--> statement-breakpoint
ALTER INDEX "grocery_items_household_idx" RENAME TO "grocery_item_household_idx";--> statement-breakpoint
ALTER INDEX "grocery_items_category_idx" RENAME TO "grocery_item_category_idx";--> statement-breakpoint
ALTER INDEX "grocery_items_checked_idx" RENAME TO "grocery_item_checked_idx";--> statement-breakpoint
ALTER TABLE "grocery_category" RENAME CONSTRAINT "grocery_categories_household_id_households_id_fk" TO "grocery_category_household_id_household_id_fk";--> statement-breakpoint
ALTER TABLE "grocery_item" RENAME CONSTRAINT "grocery_items_household_id_households_id_fk" TO "grocery_item_household_id_household_id_fk";--> statement-breakpoint
ALTER TABLE "grocery_item" RENAME CONSTRAINT "grocery_items_category_id_grocery_categories_id_fk" TO "grocery_item_category_id_grocery_category_id_fk";
--> statement-breakpoint
ALTER INDEX "households_pkey" RENAME TO "household_pkey";--> statement-breakpoint
ALTER INDEX "grocery_categories_pkey" RENAME TO "grocery_category_pkey";--> statement-breakpoint
ALTER INDEX "grocery_items_pkey" RENAME TO "grocery_item_pkey";
