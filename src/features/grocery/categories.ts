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

/**
 * Halo shown on the category a dragged item would land in. It picks up the same
 * hue as the header tint, at a weight that still reads on the paler ones, so the
 * drop target announces itself without the card being greyed out.
 */
export const CATEGORY_DROP_GLOW_STYLES: Record<string, string> = {
  Obst: "ring-rose-500 shadow-rose-500/45",
  Gemüse: "ring-green-600 shadow-green-600/45",
  Gebäck: "ring-amber-500 shadow-amber-500/45",
  Haushalt: "ring-blue-500 shadow-blue-500/45",
  "Mehl, Nudeln, Trockenwaren": "ring-orange-500 shadow-orange-500/45",
  Kühlregal: "ring-cyan-600 shadow-cyan-600/45",
  Gefrorenes: "ring-indigo-500 shadow-indigo-500/45",
};

export const FALLBACK_CATEGORY_DROP_GLOW_STYLE =
  "ring-foreground/60 shadow-foreground/40";
