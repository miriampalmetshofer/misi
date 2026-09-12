CREATE TABLE "fuel_fill_up" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filled_on" date NOT NULL,
	"miriam_km" numeric(10, 1) NOT NULL,
	"simon_km" numeric(10, 1) NOT NULL,
	"shared_km" numeric(10, 1) NOT NULL,
	"car_km" numeric(10, 1) NOT NULL,
	"paid_amount" numeric(10, 2) NOT NULL,
	"offset_mode" text NOT NULL,
	"miriam_amount" numeric(10, 2) NOT NULL,
	"simon_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "fuel_fill_up_filled_on_idx" ON "fuel_fill_up" USING btree ("filled_on");