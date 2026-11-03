ALTER TABLE "grocery_category" ADD COLUMN "quick_add_items" text[] DEFAULT '{}'::text[] NOT NULL;
--> statement-breakpoint
UPDATE "grocery_category" SET "quick_add_items" = CASE "name"
  WHEN 'Obst' THEN ARRAY['Bananen', 'Nektarinen']
  WHEN 'Gemüse' THEN ARRAY['Tomaten', 'Avocados']
  WHEN 'Mehl, Nudeln, Trockenwaren' THEN ARRAY['Nudeln']
  WHEN 'Kühlregal' THEN ARRAY['Milch', 'Eier', 'Skyr', 'Oatly']
  WHEN 'Gefrorenes' THEN ARRAY['Erdbeeren', 'Mango', 'Heidelbeeren', 'Himbeeren']
  ELSE ARRAY[]::text[]
END;
