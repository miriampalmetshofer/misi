import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { FuelOverview } from "@/features/fuel/FuelOverview";
import { FuelSplit } from "@/features/fuel/FuelSplit";
import { FuelTabs } from "@/features/fuel/FuelTabs";
import { getFuelFillUps } from "@/features/fuel/queries";
import { viewFromParam } from "@/features/fuel/views";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tanken",
};

export default async function TankenPage({
  searchParams,
}: {
  searchParams: Promise<{ ansicht?: string | string[] }>;
}) {
  const [fillUps, { ansicht }] = await Promise.all([
    getFuelFillUps(),
    searchParams,
  ]);
  const view = viewFromParam(ansicht);

  return (
    <div className="min-h-screen bg-background text-base text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <Link href="/" className="page-back-link">
          <ChevronLeft aria-hidden="true" className="size-4" />
          <span>Home</span>
        </Link>

        <h1 className="page-headline">Tanken</h1>

        <FuelTabs current={view} />

        {view === "uebersicht" ? (
          <FuelOverview fillUps={fillUps} />
        ) : (
          <FuelSplit fillUps={fillUps} />
        )}
      </main>
    </div>
  );
}
