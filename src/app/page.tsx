import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="border-b border-neutral-200 pb-5">
          <h1 className="text-2xl font-bold uppercase leading-none sm:text-3xl">
            Misi
          </h1>
        </header>

        <section>
          <h2 className="text-xl font-bold leading-tight sm:text-2xl">
            Zuhause
          </h2>
          <div className="mt-4">
            <Link
              className="block rounded-lg border border-neutral-200 bg-white p-4 text-base font-semibold text-neutral-900 transition hover:border-neutral-300 hover:bg-neutral-50 sm:text-lg"
              href="/einkauf"
            >
              Einkaufsliste
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
