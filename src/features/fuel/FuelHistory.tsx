"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { euro, formatFillUpDate } from "./format";
import type { OptimisticFuelFillUpEntry } from "./types";

type FuelHistoryProps = {
  entries: OptimisticFuelFillUpEntry[];
  onDelete: (id: string) => void;
};

export function FuelHistory({ entries, onDelete }: FuelHistoryProps) {
  return (
    <section aria-labelledby="verlauf" className="flex flex-col gap-3">
      <h2 className="section-label" id="verlauf">
        Verlauf
      </h2>

      {entries.length === 0 ? (
        <p className="text-body-muted">
          Noch keine Tankfüllungen gespeichert.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 text-card-foreground sm:p-4"
              // Lets the e2e suite wait for the insert to come back before
              // reloading, rather than racing the write.
              data-syncing={entry.isSyncing ? "true" : undefined}
              key={entry.id}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm tabular-nums text-muted-foreground">
                  {formatFillUpDate(entry.filledOn)}
                </span>
                <span className="font-medium tabular-nums">
                  {euro.format(entry.paidAmount)}
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  Miriam {euro.format(entry.miriamAmount)} · Simon{" "}
                  {euro.format(entry.simonAmount)}
                </span>
              </div>

              <Button
                aria-label={`Tankfüllung vom ${formatFillUpDate(entry.filledOn)} löschen`}
                onClick={() => onDelete(entry.id)}
                size="icon"
                variant="ghost"
              >
                <Trash2 className="text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
