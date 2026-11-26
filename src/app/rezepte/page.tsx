import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Recipes } from "@/features/recipes/Recipes";
import { getRecipes } from "@/features/recipes/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rezepte" };

export default async function RecipesPage() {
  const recipes = await getRecipes();
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
      <Link href="/speiseplan" className="page-back-link">
        <ChevronLeft aria-hidden="true" className="size-4" />
        Speiseplan
      </Link>
      <h1 className="page-headline">Rezepte</h1>
      <Recipes recipes={recipes} />
    </main>
  );
}
