"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
} from "@/components/ui/item";
import { DeleteFillUpDialog } from "./DeleteFillUpDialog";
import { FillUpDetails } from "./FillUpDetails";
import { euro, formatFillUpDate } from "./format";
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
  // Several rows may be open at once, so two fill-ups can be compared without
  // one closing the other.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded((open) => {
      const next = new Set(open);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }

  // The dialog closes when the deleted fill-up leaves `entries`, i.e. once the
  // server has confirmed it. Derived rather than cleared on click, so the
  // confirmation stays on screen — saying "Wird gelöscht …" — for as long as
  // the delete is actually running.
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
            {visible.map((entry) => {
              const date = formatFillUpDate(entry.filledOn);
              const isExpanded = expanded.has(entry.id);
              const detailsId = `details-${entry.id}`;

              return (
                <Item
                  key={entry.id}
                  variant="outline"
                  // Rendered as an <li> so the role="list" ItemGroup sets has
                  // real listitem children rather than bare divs.
                  render={<li />}
                >
                  <ItemContent>
                    {/* The chevron lives inside the toggle, not beside it: an
                        arrow that says "tap me" has to be part of the target.
                        The button stretches across the row so the gap between
                        the text and the arrow is clickable too. It stays a
                        sibling of the delete button rather than wrapping it —
                        a button inside a button is invalid and would swallow
                        the inner click. */}
                    <button
                      aria-controls={detailsId}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center gap-3 text-left"
                      onClick={() => toggleExpanded(entry.id)}
                      type="button"
                    >
                      {/* Spans rather than ItemDescription/ItemTitle, which
                          render <p> and <div>: neither is allowed inside a
                          <button>. The muted styling is repeated here instead. */}
                      <span className="flex flex-1 flex-col gap-1">
                        <span className="text-sm leading-normal text-muted-foreground tabular-nums">
                          {date}
                        </span>
                        <span className="text-sm leading-snug font-medium tabular-nums">
                          {euro.format(entry.paidAmount)}
                        </span>
                        <span className="text-sm leading-normal text-muted-foreground tabular-nums">
                          Miriam {euro.format(entry.miriamAmount)} · Simon{" "}
                          {euro.format(entry.simonAmount)}
                        </span>
                      </span>

                      <ChevronDown
                        aria-hidden="true"
                        className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </ItemContent>

                  <ItemActions>
                    <Button
                      aria-label={`Tankfüllung vom ${date} löschen`}
                      onClick={() => setSelected(entry)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </ItemActions>

                  {isExpanded ? (
                    <div className="basis-full" id={detailsId}>
                      <FillUpDetails entry={entry} />
                    </div>
                  ) : null}
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
