CREATE TABLE "quitt_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"kind" text NOT NULL,
	"description" varchar(200) NOT NULL,
	"amount_cents" integer NOT NULL,
	"paid_by" text NOT NULL,
	"for_whom" text NOT NULL,
	"occurred_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quitt_positive_amount" CHECK ("quitt_entry"."amount_cents" > 0 and "quitt_entry"."amount_cents" <= 999999999),
	CONSTRAINT "quitt_kind_valid" CHECK ("quitt_entry"."kind" in ('expense', 'payment')),
	CONSTRAINT "quitt_payer_valid" CHECK ("quitt_entry"."paid_by" in ('miriam', 'simon')),
	CONSTRAINT "quitt_beneficiary_valid" CHECK ("quitt_entry"."for_whom" in ('miriam', 'simon', 'both')),
	CONSTRAINT "quitt_payment_recipient" CHECK ("quitt_entry"."kind" != 'payment' or ("quitt_entry"."for_whom" != 'both' and "quitt_entry"."for_whom" != "quitt_entry"."paid_by")),
	CONSTRAINT "quitt_description_not_empty" CHECK (length(trim("quitt_entry"."description")) > 0)
);
