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
  Obst: ["Äpfel", "Bananen", "Beeren", "Zitronen"],
  Gemüse: ["Tomaten", "Gurken", "Paprika", "Karotten", "Zwiebeln"],
  Gebäck: ["Brot", "Semmeln", "Toast", "Wraps"],
  Haushalt: ["Küchenrolle", "Klopapier", "Spülmittel", "Müllsäcke"],
  "Mehl, Nudeln, Trockenwaren": ["Nudeln", "Reis", "Mehl", "Haferflocken"],
  Kühlregal: ["Milch", "Joghurt", "Butter", "Käse", "Eier"],
  Gefrorenes: ["Spinat", "Pizza", "Beeren", "Gemüse-Mix"],
  Sonstiges: ["Kaffee", "Tee", "Schokolade", "Haferdrink"],
};
