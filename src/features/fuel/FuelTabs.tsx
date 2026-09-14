"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import type { FuelView } from "./views";
import { VIEWS } from "./views";

/**
 * Switches between the calculator and the overview.
 *
 * Deliberately not built on the shadcn Tabs component. That one owns the panel
 * state and expects its triggers to be native buttons — rendering them as
 * links makes Base UI drop button semantics and put `tabindex="-1"` on the
 * inactive tab, so it stops being reachable by keyboard, and it announces a
 * `tab` whose `tabpanel` does not exist because the server renders the view.
 *
 * The view lives in the query string instead, which is what makes each tab
 * shareable, reloadable and reachable with the back button — so these are
 * plain links, styled to match the Tabs look. `scroll={false}` keeps the page
 * where it is: the two views share a header, and jumping to the top on every
 * switch would look like a full navigation.
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
