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
