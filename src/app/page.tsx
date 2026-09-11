import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";

const modules = [
  {
    title: "Einkaufsliste",
    description: "Gemeinsame Einkaufsliste für den Haushalt.",
  }
];

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-5 py-5 sm:px-8 sm:py-6 lg:px-10">
        <h1 className="text-app-brand">Misi</h1>

        <Button variant="outline" size="icon-lg" aria-label="Menü öffnen">
          <Menu />
        </Button>
      </header>

      <section className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-12">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 lg:gap-6">
          {modules.map((module) => (
            <article
              className="flex flex-col rounded-2xl border bg-card p-5 text-card-foreground sm:p-7 lg:p-9"
              key={module.title}
            >
              <div>
                <h2 className="text-card-title">{module.title}</h2>
                <p className="text-body-muted mt-2">{module.description}</p>
              </div>

              <span className="mt-6 inline-flex w-fit whitespace-nowrap rounded-md border bg-muted px-3 py-2 text-xs font-semibold uppercase leading-none tracking-widest text-muted-foreground sm:px-4 sm:text-sm lg:mt-8 lg:text-base">
                Bald verfügbar
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
