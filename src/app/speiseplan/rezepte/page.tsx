import { Recipes } from "@/features/recipes/Recipes";
import { getRecipes } from "@/features/recipes/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rezepte" };

export default async function RecipesPage() {
  const recipes = await getRecipes();
  return <Recipes recipes={recipes} />;
}
