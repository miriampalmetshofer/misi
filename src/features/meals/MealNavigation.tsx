"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const sections = [
  { href: "/speiseplan", label: "Speiseplan" },
  { href: "/speiseplan/rezepte", label: "Rezepte" },
];

export function MealNavigation() {
  const pathname = usePathname();
  const week = useSearchParams().get("woche");
  return (
    <nav aria-label="Kochen" className="mt-4 flex gap-4 border-b">
      {sections.map(({ href, label }) => (
        <Link
          key={href}
          href={week ? { pathname: href, query: { woche: week } } : href}
          aria-current={pathname === href ? "page" : undefined}
          className="-mb-px rounded-t-sm border-b-2 border-transparent px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:border-foreground aria-[current=page]:text-foreground"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
