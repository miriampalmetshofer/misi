-- DROP TABLE ... CASCADE also removes the foreign-key constraints that
-- referenced "household", so they must not be dropped explicitly afterwards.
ALTER TABLE "household" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "household" CASCADE;--> statement-breakpoint
DROP INDEX "grocery_category_household_idx";--> statement-breakpoint
DROP INDEX "grocery_category_household_name_unique";--> statement-breakpoint
DROP INDEX "grocery_item_household_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "grocery_category_name_unique" ON "grocery_category" USING btree ("name");--> statement-breakpoint
ALTER TABLE "grocery_category" DROP COLUMN "household_id";--> statement-breakpoint
ALTER TABLE "grocery_item" DROP COLUMN "household_id";
