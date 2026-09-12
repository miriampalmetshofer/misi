import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";

const modules = [
  {
    title: "Einkaufsliste",
    description: "Gemeinsame Einkaufsliste für den Haushalt.",
    href: "/einkauf",
  },
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
            <Link
              className="flex flex-col rounded-2xl border bg-card p-5 text-card-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:p-7 lg:p-9"
              href={module.href}
              key={module.title}
            >
              <h2 className="text-card-title">{module.title}</h2>
              <p className="text-body-muted mt-2">{module.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
