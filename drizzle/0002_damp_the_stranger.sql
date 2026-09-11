ALTER TABLE "grocery_item_category_preferences" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "grocery_item_category_preferences" CASCADE;--> statement-breakpoint
DROP INDEX "grocery_items_household_normalized_name_unique";--> statement-breakpoint
ALTER TABLE "grocery_items" DROP COLUMN "normalized_name";--> statement-breakpoint
ALTER TABLE "grocery_items" DROP COLUMN "completed_count";