export default function EinkaufLoading() {
  return (
    <div className="min-h-screen bg-stone-50 text-base text-neutral-950">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        {/* Mirrors the header/headline of ShoppingListView via the shared
            .page-back-link / .page-headline classes so the skeleton matches
            the loaded page. Non-interactive here (no navigation during load). */}
        <div aria-hidden="true" className="page-back-link">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>Home</span>
        </div>

        <h1 className="page-headline">Einkaufsliste</h1>

        <div
          aria-hidden="true"
          className="mt-8 space-y-5 sm:mt-12 sm:space-y-8"
        >
          {Array.from({ length: 4 }).map((_, sectionIndex) => (
            <section key={sectionIndex}>
              <div className="h-5 w-40 animate-pulse rounded bg-neutral-200/70" />
              <div className="mt-3 space-y-1">
                {Array.from({ length: 2 }).map((_, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="h-10 animate-pulse rounded-lg bg-neutral-200/70"
                  />
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
