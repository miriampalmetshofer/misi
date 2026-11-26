ALTER TABLE "meal_product_list" ADD COLUMN "name" varchar(200);
--> statement-breakpoint
WITH whitespace AS (
  SELECT U&'\0009\000A\000B\000C\000D\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF' AS chars
)
UPDATE "meal_product_list" AS recipe
SET name = coalesce((
  SELECT meal.name
  FROM "meal_entry" AS meal CROSS JOIN whitespace
  WHERE lower(trim(regexp_replace(
    translate(meal.name COLLATE pg_catalog."de-x-icu", chars, repeat(' ', length(chars))),
    ' +', ' ', 'g'
  ))) = recipe.dish_key
  ORDER BY meal.updated_at DESC, meal.id
  LIMIT 1
), left(recipe.dish_key, 200));
--> statement-breakpoint
ALTER TABLE "meal_product_list" ALTER COLUMN "name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "meal_product_list" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
-- A preview on which the quantity migration ran before the store migration
-- was rebased underneath it can have passed the earlier Drizzle timestamp.
CREATE TABLE IF NOT EXISTS "grocery_store_preference" (
  "normalized_name" text PRIMARY KEY NOT NULL,
  "stores" text[] NOT NULL
);
--> statement-breakpoint
WITH legacy AS (
  SELECT stores, regexp_match(normalized_name, '^([0-9]{1,9}) *[x×] *(.*)$', 'i') AS parts
  FROM grocery_store_preference
)
INSERT INTO grocery_store_preference AS preference (normalized_name, stores)
SELECT trim(parts[2]), array_agg(DISTINCT store ORDER BY store)
FROM legacy CROSS JOIN LATERAL unnest(stores) AS store
WHERE parts[1]::integer > 0 AND trim(parts[2]) <> ''
GROUP BY trim(parts[2])
ON CONFLICT (normalized_name) DO UPDATE
  SET stores = ARRAY(
    SELECT DISTINCT store
    FROM unnest(preference.stores || excluded.stores) AS store
    ORDER BY store
  );
