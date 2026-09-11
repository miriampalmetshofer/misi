CREATE TABLE "grocery_item_category_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"normalized_item_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grocery_items" ALTER COLUMN "name" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "grocery_categories" ADD COLUMN "icon" text DEFAULT '📦' NOT NULL;--> statement-breakpoint
ALTER TABLE "grocery_items" ADD COLUMN "normalized_name" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "grocery_items" ADD COLUMN "quantity" varchar DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "grocery_items" ADD COLUMN "completed_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "grocery_items" ADD COLUMN "last_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "grocery_item_category_preferences" ADD CONSTRAINT "grocery_item_category_preferences_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_item_category_preferences" ADD CONSTRAINT "grocery_item_category_preferences_category_id_grocery_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."grocery_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grocery_preferences_household_idx" ON "grocery_item_category_preferences" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "grocery_preferences_category_idx" ON "grocery_item_category_preferences" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grocery_preferences_household_item_unique" ON "grocery_item_category_preferences" USING btree ("household_id","normalized_item_name");--> statement-breakpoint
CREATE UNIQUE INDEX "grocery_items_household_normalized_name_unique" ON "grocery_items" USING btree ("household_id","normalized_name");