import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { CarExpenses } from "@/features/car/CarExpenses";
import { CarTabs } from "@/features/car/CarTabs";
import { getCarExpenses } from "@/features/car/queries";
import { FuelOverview } from "@/features/fuel/FuelOverview";
import { FuelSplit } from "@/features/fuel/FuelSplit";
import { FuelTabs } from "@/features/fuel/FuelTabs";
import { getFuelFillUps } from "@/features/fuel/queries";
import { viewFromParam } from "@/features/fuel/views";

export const dynamic = "force-dynamic";
export const metadata = { title: "Auto" };

export default async function AutoPage({
  searchParams,
}: {
  searchParams: Promise<{
    bereich?: string | string[];
    ansicht?: string | string[];
  }>;
}) {
  const { bereich, ansicht } = await searchParams;
  const expenses = bereich === "ausgaben";
  const view = viewFromParam(ansicht);
  const content = expenses ? (
    <CarExpenses entries={await getCarExpenses()} />
  ) : (
    <FuelContent view={view} />
  );

  return (
    <div className="min-h-screen bg-background text-base text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <Link href="/" className="page-back-link">
          <ChevronLeft aria-hidden="true" className="size-4" />
          <span>Home</span>
        </Link>
        <h1 className="page-headline">Auto</h1>
        <CarTabs expenses={expenses} />
        {content}
      </main>
    </div>
  );
}

async function FuelContent({
  view,
}: {
  view: ReturnType<typeof viewFromParam>;
}) {
  const fillUps = await getFuelFillUps();
  return (
    <>
      <FuelTabs current={view} />
      {view === "uebersicht" ? (
        <FuelOverview fillUps={fillUps} />
      ) : (
        <FuelSplit fillUps={fillUps} />
      )}
    </>
  );
}
