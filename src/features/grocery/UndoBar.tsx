"use client";

import { Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type UndoBarProps = {
  label: string;
  onUndo: () => void;
};

/**
 * The undo offer for the last checked-off item. Rendered inside a live region
 * (see ShoppingListView) so it is announced when it appears, and keyed by offer
 * there so replacing one offer with another replays the enter animation.
 */
export function UndoBar({ label, onUndo }: UndoBarProps) {
  return (
    // Inverted against the page rather than card-coloured: the bar floats over
    // the list, and in dark mode a bg-card bar is the same near-black as the
    // cards it covers, with shadow-lg too faint to separate them.
    <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-xl bg-foreground py-2 pl-4 pr-2 text-background shadow-lg animate-in fade-in slide-in-from-bottom-2">
      <p className="min-w-0 flex-1 truncate text-sm">{label}</p>

      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 font-medium hover:bg-background/15 hover:text-background"
        onClick={onUndo}
      >
        <Undo2 aria-hidden="true" />
        Rückgängig
      </Button>
    </div>
  );
}
