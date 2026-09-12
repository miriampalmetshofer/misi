export const FALLBACK_GROCERY_CATEGORY = "Sonstiges";

export const DEFAULT_GROCERY_CATEGORIES = [
  { name: "Obst", icon: "🍎", sortOrder: 10 },
  { name: "Gemüse", icon: "🥦", sortOrder: 20 },
  { name: "Gebäck", icon: "🥐", sortOrder: 30 },
  { name: "Haushalt", icon: "🧴", sortOrder: 40 },
  { name: "Mehl, Nudeln, Trockenwaren", icon: "🌾", sortOrder: 50 },
  { name: "Kühlregal", icon: "🥛", sortOrder: 60 },
  { name: "Gefrorenes", icon: "🧊", sortOrder: 70 },
  { name: "Sonstiges", icon: "📦", sortOrder: 80 },
] as const;

export const QUICK_ADD_GROCERY_ITEMS: Record<string, string[]> = {
  Obst: ["Bananen", "Nektarinen"],
  Gemüse: ["Tomaten", "Avocados"],
  "Mehl, Nudeln, Trockenwaren": ["Nudeln"],
  Kühlregal: ["Milch", "Eier", "Skyr", "Oatly"],
  Gefrorenes: ["Erdbeeren", "Mango", "Heidelbeeren", "Himbeeren"],
};

/** Header tint per category. */
export const CATEGORY_HEADER_STYLES: Record<string, string> = {
  Obst: "bg-rose-50 dark:bg-rose-950/30",
  Gemüse: "bg-green-50 dark:bg-green-950/30",
  Gebäck: "bg-amber-50 dark:bg-amber-950/30",
  Haushalt: "bg-blue-50 dark:bg-blue-950/30",
  "Mehl, Nudeln, Trockenwaren": "bg-orange-50 dark:bg-orange-950/30",
  Kühlregal: "bg-cyan-50 dark:bg-cyan-950/30",
  Gefrorenes: "bg-indigo-50 dark:bg-indigo-950/30",
};

export const FALLBACK_CATEGORY_HEADER_STYLE = "bg-muted/60";
