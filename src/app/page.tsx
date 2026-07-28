const modules = [
  {
    initial: "G",
    title: "Groceries",
    description: "Shared shopping list for the house.",
  },
  {
    initial: "C",
    title: "Chores",
    description: "Recurring household tasks split between you two.",
  },
  {
    initial: "N",
    title: "Shared Notes",
    description: "Quick notes and reminders you both can see.",
  },
  {
    initial: "U",
    title: "Upcoming",
    description: "Household to-dos and reminders coming up.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-white text-neutral-950">
      <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-5 sm:px-8 sm:py-6 lg:px-10">
        <h1 className="text-app-brand">Misi</h1>

        <button
          type="button"
          aria-label="Open menu"
          className="flex size-12 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 sm:size-14"
        >
          <span className="flex flex-col gap-1" aria-hidden="true">
            <span className="block h-0.5 w-5 bg-current sm:w-6" />
            <span className="block h-0.5 w-5 bg-current sm:w-6" />
            <span className="block h-0.5 w-5 bg-current sm:w-6" />
          </span>
        </button>
      </header>

      <section className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-12">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 lg:gap-6">
          {modules.map((module) => (
            <article
              className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7 lg:p-9"
              key={module.title}
            >
              <div className="flex size-12 items-center justify-center rounded-xl border-2 border-neutral-300 text-2xl font-bold text-neutral-800 sm:size-14 lg:size-16">
                {module.initial}
              </div>

              <div className="mt-6 lg:mt-8">
                <h2 className="text-card-title">{module.title}</h2>
                <p className="text-body-muted mt-2 max-w-prose">
                  {module.description}
                </p>
              </div>

              <div className="mt-6 inline-flex w-fit whitespace-nowrap rounded-md border-2 border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold uppercase leading-none tracking-widest text-cyan-800 sm:px-4 sm:text-sm lg:mt-8 lg:text-base">
                Coming soon
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
