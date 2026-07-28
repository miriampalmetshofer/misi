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
    <main className="w-full min-h-screen bg-white text-[#070707]">
      <header className="flex h-20 items-center justify-between border-b border-[#dedbd8] px-5 sm:h-24 sm:px-8 lg:h-[132px] lg:px-10">
        <h1 className="text-[30px] font-bold uppercase leading-none tracking-[0.03em] sm:text-4xl lg:text-[40px]">
          Misi
        </h1>

        <button
          type="button"
          aria-label="Open menu"
          className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[#d7d3cf] bg-white text-[#3a3937] sm:size-14 lg:size-[60px]"
        >
          <span className="flex flex-col gap-1" aria-hidden="true">
            <span className="block h-0.5 w-5 bg-current sm:h-[3px] sm:w-6" />
            <span className="block h-0.5 w-5 bg-current sm:h-[3px] sm:w-6" />
            <span className="block h-0.5 w-5 bg-current sm:h-[3px] sm:w-6" />
          </span>
        </button>
      </header>

      <section className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-12">
        <div className="mx-auto grid max-w-[1180px] gap-5 md:grid-cols-2 lg:gap-x-6 lg:gap-y-7">
          {modules.map((module) => (
            <article
              className="flex min-h-[210px] flex-col rounded-2xl border border-[#dedbd8] bg-white px-5 py-5 sm:min-h-[260px] sm:px-7 sm:py-7 lg:min-h-[338px] lg:px-9 lg:py-8"
              key={module.title}
            >
              <div className="flex size-12 items-center justify-center rounded-xl border-2 border-[#c9c5c1] text-2xl font-bold text-[#2f2e2d] sm:size-14 lg:size-[68px] lg:text-3xl">
                {module.initial}
              </div>

              <div className="mt-6 lg:mt-8">
                <h2 className="text-[23px] font-bold leading-tight tracking-normal sm:text-[26px] lg:text-[28px]">
                  {module.title}
                </h2>
                <p className="mt-2 max-w-[440px] text-[17px] leading-snug text-[#706c68] sm:text-xl lg:text-[25px] lg:leading-[1.28]">
                  {module.description}
                </p>
              </div>

              <div className="mt-6 inline-flex w-fit whitespace-nowrap rounded-md border-2 border-[#61d7e7] bg-[#d7fbff] px-3.5 py-2 text-xs font-semibold uppercase leading-none tracking-[0.12em] text-[#006f82] sm:text-base lg:mt-8 lg:px-4 lg:text-[18px]">
                Coming soon
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
