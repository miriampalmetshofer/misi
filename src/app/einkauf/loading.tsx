export default function EinkaufLoading() {
  return (
    <div className="min-h-screen bg-stone-50 text-base text-neutral-950">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
        <div className="flex items-center gap-2 text-base text-neutral-600 sm:text-lg">
          <span aria-hidden="true" className="text-2xl leading-none sm:text-3xl">
            ‹
          </span>
          <span>Home</span>
        </div>

        <h1 className="mt-12 text-4xl font-bold leading-none tracking-normal sm:mt-14 sm:text-5xl">
          Einkaufsliste
        </h1>

        <div
          aria-hidden="true"
          className="mt-10 space-y-10 sm:mt-12 sm:space-y-12"
        >
          {Array.from({ length: 4 }).map((_, sectionIndex) => (
            <section key={sectionIndex}>
              <div className="h-5 w-40 animate-pulse rounded bg-neutral-200/70" />
              <div className="mt-5 space-y-2">
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
