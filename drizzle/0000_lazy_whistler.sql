CREATE TABLE "grocery_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grocery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"is_checked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grocery_categories" ADD CONSTRAINT "grocery_categories_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_category_id_grocery_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."grocery_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grocery_categories_household_idx" ON "grocery_categories" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grocery_categories_household_name_unique" ON "grocery_categories" USING btree ("household_id","name");--> statement-breakpoint
CREATE INDEX "grocery_items_household_idx" ON "grocery_items" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "grocery_items_category_idx" ON "grocery_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "grocery_items_checked_idx" ON "grocery_items" USING btree ("is_checked");