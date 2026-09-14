import { ChevronLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export default function EinkaufLoading() {
  return (
    <div className="min-h-screen bg-background text-base text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        {/* Mirrors the header/headline of ShoppingListView via the shared
            .page-back-link / .page-headline classes so the skeleton matches
            the loaded page. Non-interactive here (no navigation during load). */}
        <div aria-hidden="true" className="page-back-link">
          <ChevronLeft className="size-4" />
          <span>Home</span>
        </div>

        <h1 className="page-headline">Einkaufsliste</h1>

        <div
          aria-hidden="true"
          className="mt-8 space-y-5 sm:mt-12 sm:space-y-8"
        >
          {Array.from({ length: 4 }).map((_, sectionIndex) => (
            <section key={sectionIndex}>
              <Skeleton className="h-5 w-40" />
              <div className="mt-3 space-y-1">
                {Array.from({ length: 2 }).map((_, rowIndex) => (
                  // rounded-lg to match the real rows, which Skeleton's own
                  // rounded-md would otherwise undercut.
                  <Skeleton key={rowIndex} className="h-10 rounded-lg" />
                ))}
              </div>
            </section>
          ))}
        </div>

        <span className="sr-only">Einkaufsliste wird geladen …</span>
      </main>
    </div>
  );
}
