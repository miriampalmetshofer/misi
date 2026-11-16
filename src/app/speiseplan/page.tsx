import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { MealPlanner } from "@/features/meals/MealPlanner";
import { getWeekMeals } from "@/features/meals/queries";
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
  const entries = await getWeekMeals(start);
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
      <Link href="/" className="page-back-link">
        <ChevronLeft aria-hidden="true" className="size-4" />
        Home
      </Link>
      <h1 className="page-headline">Speiseplan</h1>
      <MealPlanner key={start} start={start} today={today} entries={entries} />
    </main>
  );
}
