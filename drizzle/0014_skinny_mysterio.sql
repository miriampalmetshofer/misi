ALTER TABLE "car_expense" ADD COLUMN "paid_by" text;--> statement-breakpoint
ALTER TABLE "fuel_fill_up" ADD COLUMN "paid_by" text;--> statement-breakpoint
ALTER TABLE "car_expense" DROP COLUMN "is_settled";--> statement-breakpoint
ALTER TABLE "fuel_fill_up" DROP COLUMN "is_settled";--> statement-breakpoint
ALTER TABLE "car_expense" ADD CONSTRAINT "car_expense_payer_valid" CHECK ("car_expense"."paid_by" in ('miriam', 'simon'));--> statement-breakpoint
ALTER TABLE "fuel_fill_up" ADD CONSTRAINT "fuel_fill_up_payer_valid" CHECK ("fuel_fill_up"."paid_by" in ('miriam', 'simon'));