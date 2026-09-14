"use client";

import { useState } from "react";
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
import { DeleteFillUpDialog } from "./DeleteFillUpDialog";
import { euro, formatFillUpDate } from "./format";
import { HistoryPagination } from "./HistoryPagination";
import { PAGE_SIZE, clampPage, pageCountFor } from "./paginate";
import type { OptimisticFuelFillUpEntry } from "./types";

type FuelHistoryProps = {
  entries: OptimisticFuelFillUpEntry[];
  onDelete: (id: string) => void;
};

export function FuelHistory({ entries, onDelete }: FuelHistoryProps) {
  const [page, setPage] = useState(1);
  // Held as the whole entry rather than an id: the dialog names the fill-up it
  // is about, and the row is gone from `entries` by the time it closes.
  const [pendingDelete, setPendingDelete] =
    useState<OptimisticFuelFillUpEntry | null>(null);

  const pageCount = pageCountFor(entries.length);
  // Deleting the last fill-up on a page leaves the stored number past the end
  // of the list, so every read goes through the clamp. Derived rather than
  // corrected in an effect: there is no render in which the stored number is
  // the one being displayed.
  const currentPage = clampPage(page, pageCount);

  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = entries.slice(start, start + PAGE_SIZE);

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
        <>
          <ItemGroup className="gap-2">
            {visible.map((entry) => {
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
                      onClick={() => setPendingDelete(entry)}
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

          {pageCount > 1 ? (
            <HistoryPagination
              page={currentPage}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}

      <DeleteFillUpDialog
        entry={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            onDelete(pendingDelete.id);
          }
          setPendingDelete(null);
        }}
      />
    </section>
  );
}
