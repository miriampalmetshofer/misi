CREATE TABLE "meal_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planned_on" date NOT NULL,
	"meal_time" text NOT NULL,
	"person" text DEFAULT 'both' NOT NULL,
	"name" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_entry_time_valid" CHECK ("meal_entry"."meal_time" in ('lunch', 'dinner')),
	CONSTRAINT "meal_entry_person_valid" CHECK ("meal_entry"."person" in ('both', 'miriam', 'simon')),
	CONSTRAINT "meal_entry_name_not_empty" CHECK (length(trim("meal_entry"."name")) > 0)
);
--> statement-breakpoint
CREATE INDEX "meal_entry_planned_on_idx" ON "meal_entry" USING btree ("planned_on");