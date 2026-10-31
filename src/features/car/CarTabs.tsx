import Link from "next/link";

import { cn } from "@/lib/utils";

export function CarTabs({ expenses }: { expenses: boolean }) {
  return (
    <nav
      aria-label="Auto-Bereich"
      className="mt-6 flex gap-1 rounded-lg bg-muted p-[3px] sm:mt-8"
    >
      {[
        { label: "Tanken", href: "/auto", current: !expenses },
        {
          label: "Reparaturen & Einkäufe",
          href: "/auto?bereich=ausgaben",
          current: expenses,
        },
      ].map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          scroll={false}
          aria-current={tab.current ? "page" : undefined}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors focus-visible:outline-1 focus-visible:outline-ring",
            tab.current
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
