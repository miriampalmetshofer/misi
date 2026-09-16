"use client";

import { useState } from "react";

import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import { DeleteFillUpDialog } from "./DeleteFillUpDialog";
import { FillUpRow } from "./FillUpRow";
import { HistoryPagination } from "./HistoryPagination";
import { PAGE_SIZE, clampPage, pageCountFor } from "./paginate";
import type { FuelFillUpEntry } from "./types";

type FuelHistoryProps = {
  entries: FuelFillUpEntry[];
  /** True while a delete is in flight, so the dialog can say so. */
  isDeleting: boolean;
  onDelete: (id: string) => void;
};

export function FuelHistory({
  entries,
  isDeleting,
  onDelete,
}: FuelHistoryProps) {
  const [page, setPage] = useState(1);
  // Held as the whole entry rather than an id: the dialog names the fill-up it
  // is about, and needs those details for as long as it is open.
  const [selected, setSelected] = useState<FuelFillUpEntry | null>(null);
  // The dialog closes when the deleted fill-up leaves `entries`, i.e. once the
  // server has confirmed it saying "Wird gelöscht …" 
  const pendingDelete =
    selected && entries.some((entry) => entry.id === selected.id)
      ? selected
      : null;

  const pageCount = pageCountFor(entries.length);
  // Deleting the last fill-up on a page leaves the stored number past the end
  // of the list, so every read goes through the clamp.
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
            {visible.map((entry) => (
              <FillUpRow
                key={entry.id}
                entry={entry}
                onDelete={() => setSelected(entry)}
              />
            ))}
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
        isDeleting={isDeleting}
        onCancel={() => setSelected(null)}
        onConfirm={() => {
          if (pendingDelete) {
            onDelete(pendingDelete.id);
          }
        }}
      />
    </section>
  );
}
