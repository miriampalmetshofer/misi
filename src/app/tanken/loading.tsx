import { ChevronLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export default function TankenLoading() {
  return (
    <div className="min-h-screen bg-background text-base text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        {/* Mirrors the header/headline of FuelSplit via the shared
            .page-back-link / .page-headline classes so the skeleton matches
            the loaded page. Non-interactive here (no navigation during load). */}
        <div aria-hidden="true" className="page-back-link">
          <ChevronLeft className="size-4" />
          <span>Home</span>
        </div>

        <h1 className="page-headline">Tanken</h1>

        {/* Matches the FuelTabs row so the content below does not shift down
            once the page loads. */}
        <Skeleton aria-hidden="true" className="mt-6 h-12 rounded-xl sm:mt-8" />

        <div aria-hidden="true" className="mt-8 flex flex-col gap-8 sm:mt-12">
          {/* Date row: label left, input right, as in the form. */}
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-9 w-40 rounded-lg" />
          </div>

          {/* The three km sections, then the amount: a heading and its rows. */}
          {[3, 1, 1].map((rows, sectionIndex) => (
            <section key={sectionIndex} className="flex flex-col gap-3">
              <Skeleton className="h-4 w-28" />
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <Skeleton key={rowIndex} className="h-9 rounded-lg" />
              ))}
            </section>
          ))}

          {/* The result card, which carries the save button. */}
          <Skeleton className="h-48 rounded-2xl" />

          <section className="flex flex-col gap-3">
            <Skeleton className="h-4 w-20" />
            {Array.from({ length: 3 }).map((_, rowIndex) => (
              <Skeleton key={rowIndex} className="h-20 rounded-lg" />
            ))}
          </section>
        </div>

        <span className="sr-only">Tanken wird geladen …</span>
      </main>
    </div>
  );
}
