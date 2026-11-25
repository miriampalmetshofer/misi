CREATE TABLE "meal_product_list" (
	"dish_key" text PRIMARY KEY NOT NULL,
	"products" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grocery_item" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "grocery_item" ADD CONSTRAINT "grocery_item_quantity_valid" CHECK ("grocery_item"."quantity" between 1 and 999999999);
--> statement-breakpoint
WITH whitespace AS (
  SELECT U&'\0009\000A\000B\000C\000D\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF' AS chars
), legacy_items AS (
  SELECT id, regexp_match(
    trim(translate(name, chars, repeat(' ', length(chars)))),
    '^([0-9]{1,9}) *[x×] *(.+)$', 'i'
  ) AS parts
  FROM grocery_item CROSS JOIN whitespace
), updated_items AS (
  UPDATE grocery_item AS item
  SET quantity = legacy.parts[1]::integer, name = trim(legacy.parts[2])
  FROM legacy_items AS legacy
  WHERE item.id = legacy.id AND legacy.parts[1]::integer > 0 AND trim(legacy.parts[2]) <> ''
), legacy_preferences AS (
  SELECT normalized_name, category_id,
    trim(regexp_replace(translate(normalized_name, chars, repeat(' ', length(chars))), ' +', ' ', 'g')) AS clean_name
  FROM grocery_category_preference CROSS JOIN whitespace
), parsed_preferences AS (
  SELECT *, regexp_match(clean_name, '^([0-9]{1,9}) *[x×] *(.+)$', 'i') AS parts
  FROM legacy_preferences
), canonical_preferences AS (
  SELECT normalized_name, category_id, clean_name,
    CASE WHEN parts[1]::integer > 0 AND trim(parts[2]) <> '' THEN trim(parts[2]) ELSE clean_name END AS product_key
  FROM parsed_preferences
)
INSERT INTO grocery_category_preference (normalized_name, category_id)
SELECT DISTINCT ON (product_key) product_key, category_id
FROM canonical_preferences
WHERE product_key <> '' AND product_key <> normalized_name
ORDER BY product_key, (clean_name = product_key) DESC, normalized_name
ON CONFLICT (normalized_name) DO NOTHING;
