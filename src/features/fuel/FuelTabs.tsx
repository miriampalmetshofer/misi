"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import type { FuelView } from "./views";
import { VIEWS } from "./views";

/**
 * Switches between the calculator and the overview.
 *
 * Links, not shadcn Tabs: the view lives in the query string so each tab is
 * shareable and works with the back button, and Tabs triggers must be native
 * buttons — as links they lose button semantics and the inactive tab gets
 * `tabindex="-1"`, putting it out of reach of the keyboard.
 */
export function FuelTabs({ current }: { current: FuelView }) {
  return (
    <nav
      aria-label="Ansicht"
      className="mt-6 flex gap-1 rounded-lg bg-muted p-[3px] sm:mt-8"
    >
      {VIEWS.map((view) => {
        const isCurrent = view.id === current;

        return (
          <Link
            key={view.id}
            aria-current={isCurrent ? "page" : undefined}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors",
              "focus-visible:outline-1 focus-visible:outline-ring",
              isCurrent
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground/60 hover:text-foreground dark:text-muted-foreground",
            )}
            href={view.href}
            scroll={false}
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}
