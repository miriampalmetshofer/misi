import { MealPlanner } from "@/features/meals/MealPlanner";
import { getWeekMeals } from "@/features/meals/queries";
import { getRecipeNames } from "@/features/recipes/queries";
import { householdToday, isMealDate, weekStart } from "@/features/meals/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Speiseplan" };

export default async function MealPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ woche?: string | string[] }>;
}) {
  const { woche } = await searchParams;
  const today = householdToday();
  const start = weekStart(
    typeof woche === "string" && isMealDate(woche) ? woche : today,
  );
  const [entries, recipes] = await Promise.all([
    getWeekMeals(start),
    getRecipeNames(),
  ]);
  return (
    <MealPlanner
      key={start}
      start={start}
      today={today}
      entries={entries}
      recipes={recipes}
    />
  );
}
