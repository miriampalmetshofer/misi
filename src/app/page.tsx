export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-stone-50 text-stone-950">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-10 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-stone-200 pb-5">
          <div>
            <p className="text-sm font-medium text-emerald-700">Misi</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              Household home base
            </h1>
          </div>
          <div className="rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-600">
            Private beta
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Groceries", "Shared shopping list"],
            ["Chores", "Recurring household work"],
            ["Notes", "Useful shared context"],
          ].map(([title, description]) => (
            <article
              className="rounded-md border border-stone-200 bg-white p-5"
              key={title}
            >
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
