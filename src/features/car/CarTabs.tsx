import Link from "next/link";

import type { FuelView } from "@/features/fuel/views";
import { cn } from "@/lib/utils";

export function CarTabs({ current }: { current: FuelView | "ausgaben" }) {
  return (
    <nav
      aria-label="Auto-Bereich"
      className="mt-6 grid grid-cols-[auto_1fr_auto] gap-1 rounded-lg bg-muted p-[3px] sm:mt-8 sm:grid-cols-3"
    >
      {[
        { label: "Tanken", href: "/auto", id: "berechnen" },
        {
          label: "Reparaturen & Einkäufe",
          href: "/auto?bereich=ausgaben",
          id: "ausgaben",
        },
        {
          label: "Übersicht",
          href: "/auto?ansicht=uebersicht",
          id: "uebersicht",
        },
      ].map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          scroll={false}
          aria-current={tab.id === current ? "page" : undefined}
          className={cn(
            "flex items-center justify-center rounded-md px-2 py-2 text-center text-sm font-medium transition-colors focus-visible:outline-1 focus-visible:outline-ring sm:px-3",
            tab.id === current
              ? "bg-background text-foreground shadow-sm"
              : "text-foreground/60 hover:text-foreground dark:text-muted-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
