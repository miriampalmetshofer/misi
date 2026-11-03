CREATE TABLE "grocery_category_preference" (
	"normalized_name" text PRIMARY KEY NOT NULL,
	"category_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grocery_category_preference" ADD CONSTRAINT "grocery_category_preference_category_id_grocery_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."grocery_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "grocery_category_preference" ("normalized_name", "category_id")
SELECT DISTINCT ON (lower(trim(regexp_replace("name", '\s+', ' ', 'g'))))
  lower(trim(regexp_replace("name", '\s+', ' ', 'g'))), "category_id"
FROM "grocery_item"
WHERE "category_id" IS NOT NULL AND trim("name") <> ''
ORDER BY lower(trim(regexp_replace("name", '\s+', ' ', 'g'))), "updated_at" DESC, "created_at" DESC, "id" DESC;
