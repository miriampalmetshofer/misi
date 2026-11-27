import Link from "next/link";
import type { ComponentProps } from "react";

type Section = {
  href: ComponentProps<typeof Link>["href"];
  label: string;
  active: boolean;
};

export function SectionNavigation({
  label,
  sections,
  scroll,
}: {
  label: string;
  sections: Section[];
  scroll?: boolean;
}) {
  return (
    <nav aria-label={label} className="mt-4 flex gap-4 border-b">
      {sections.map(({ href, label, active }) => (
        <Link
          key={label}
          href={href}
          scroll={scroll}
          aria-current={active ? "page" : undefined}
          className="-mb-px rounded-t-sm border-b-2 border-transparent px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:border-foreground aria-[current=page]:text-foreground"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
