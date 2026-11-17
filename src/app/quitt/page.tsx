import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Quitt } from "@/features/quitt/Quitt";
import { getQuittEntries } from "@/features/quitt/queries";
import { householdToday } from "@/features/quitt/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quitt" };

export default async function QuittPage() {
  const entries = await getQuittEntries();
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
      <Link href="/" className="page-back-link">
        <ChevronLeft aria-hidden="true" className="size-4" />
        Home
      </Link>
      <h1 className="page-headline">Quitt</h1>
      <p className="text-body-muted mb-6">Gemeinsame Ausgaben</p>
      <Quitt entries={entries} today={householdToday()} />
    </main>
  );
}
