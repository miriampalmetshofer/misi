CREATE TABLE "car_expense" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spent_on" date NOT NULL,
	"description" varchar(200) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"miriam_percent" numeric(5, 2) NOT NULL,
	"miriam_amount" numeric(10, 2) NOT NULL,
	"simon_amount" numeric(10, 2) NOT NULL,
	"note" varchar(2000) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "car_expense_positive_total" CHECK ("car_expense"."total_amount" > 0),
	CONSTRAINT "car_expense_percent_range" CHECK ("car_expense"."miriam_percent" between 0 and 100),
	CONSTRAINT "car_expense_amounts_match" CHECK ("car_expense"."miriam_amount" >= 0 and "car_expense"."simon_amount" >= 0 and "car_expense"."miriam_amount" + "car_expense"."simon_amount" = "car_expense"."total_amount")
);
--> statement-breakpoint
CREATE INDEX "car_expense_spent_on_idx" ON "car_expense" USING btree ("spent_on");