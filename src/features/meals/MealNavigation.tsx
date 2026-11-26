"use client";

import { SectionNavigation } from "@/components/SectionNavigation";
import { usePathname, useSearchParams } from "next/navigation";

const sections = [
  { href: "/speiseplan", label: "Speiseplan" },
  { href: "/speiseplan/rezepte", label: "Rezepte" },
];

export function MealNavigation() {
  const pathname = usePathname();
  const week = useSearchParams().get("woche");
  return (
    <SectionNavigation
      label="Kochen"
      sections={sections.map(({ href, label }) => ({
        href: week ? { pathname: href, query: { woche: week } } : href,
        label,
        active: pathname === href,
      }))}
    />
  );
}
