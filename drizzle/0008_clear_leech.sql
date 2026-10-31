ALTER TABLE "car_expense" ADD COLUMN "is_settled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "fuel_fill_up" ADD COLUMN "is_settled" boolean DEFAULT false NOT NULL;