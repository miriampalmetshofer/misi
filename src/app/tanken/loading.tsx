import { ChevronLeft } from "lucide-react";

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

        <div aria-hidden="true" className="mt-8 flex flex-col gap-8 sm:mt-12">
          {/* Date row: label left, input right, as in the form. */}
          <div className="flex items-center justify-between gap-3">
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            <div className="h-9 w-40 animate-pulse rounded-lg bg-muted" />
          </div>

          {/* The three km sections, then the amount: a heading and its rows. */}
          {[3, 1, 1].map((rows, sectionIndex) => (
            <section key={sectionIndex} className="flex flex-col gap-3">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="h-9 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </section>
          ))}

          {/* The result card, which carries the save button. */}
          <div className="h-48 animate-pulse rounded-2xl bg-muted" />

          <section className="flex flex-col gap-3">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            {Array.from({ length: 3 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="h-20 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </section>
        </div>

        <span className="sr-only">Tanken wird geladen …</span>
      </main>
    </div>
  );
}
