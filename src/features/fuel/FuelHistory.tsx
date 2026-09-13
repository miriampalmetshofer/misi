"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
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
        <Empty className="border">
          <EmptyHeader>
            <EmptyDescription>
              Noch keine Tankfüllungen gespeichert.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ItemGroup className="gap-2">
          {entries.map((entry) => {
            const date = formatFillUpDate(entry.filledOn);

            return (
              <Item
                key={entry.id}
                variant="outline"
                // Rendered as an <li> so the role="list" ItemGroup sets has
                // real listitem children rather than bare divs.
                render={
                  <li
                    // Lets the e2e suite wait for the insert to come back
                    // before reloading, rather than racing the write.
                    data-syncing={entry.isSyncing ? "true" : undefined}
                  />
                }
              >
                <ItemContent>
                  <ItemDescription className="tabular-nums">
                    {date}
                  </ItemDescription>
                  <ItemTitle className="tabular-nums">
                    {euro.format(entry.paidAmount)}
                  </ItemTitle>
                  <ItemDescription className="tabular-nums">
                    Miriam {euro.format(entry.miriamAmount)} · Simon{" "}
                    {euro.format(entry.simonAmount)}
                  </ItemDescription>
                </ItemContent>

                <ItemActions>
                  <Button
                    aria-label={`Tankfüllung vom ${date} löschen`}
                    onClick={() => onDelete(entry.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="text-muted-foreground" />
                  </Button>
                </ItemActions>
              </Item>
            );
          })}
        </ItemGroup>
      )}
    </section>
  );
}
