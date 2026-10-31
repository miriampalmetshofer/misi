"use client";

import { useId, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent } from "@/components/ui/item";
import {
  PaymentSettledMark,
  PaymentStatus,
} from "@/features/payments/PaymentStatus";
import { euro } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { FillUpDetails } from "./FillUpDetails";
import type { FuelFillUpEntry } from "./types";

type FillUpRowProps = {
  entry: FuelFillUpEntry;
  onDelete: () => void;
};

/**
 * One fill-up in the history, expandable to show the readings behind it.
 *
 */
export function FillUpRow({ entry, onDelete }: FillUpRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = useId();
  const date = formatDate(entry.filledOn);

  return (
    <Item
      variant="outline"
      // Rendered as an <li> so the role="list" ItemGroup sets has real listitem
      // children rather than bare divs.
      render={<li />}
    >
      <ItemContent>
        <button
          aria-controls={isExpanded ? detailsId : undefined}
          aria-expanded={isExpanded}
          className="flex w-full items-center gap-3 text-left"
          onClick={() => setIsExpanded((open) => !open)}
          type="button"
        >
          {/* Spans rather than ItemDescription/ItemTitle, which render <p> and
              <div>: neither is allowed inside a <button>. The muted styling is
              repeated here instead. */}
          <span className="flex flex-1 flex-col gap-1">
            <span className="text-sm leading-normal text-muted-foreground tabular-nums">
              {date}
            </span>
            <span className="flex items-center gap-2 text-sm leading-snug font-medium tabular-nums">
              {euro.format(entry.paidAmount)}
              {entry.isSettled ? <PaymentSettledMark /> : null}
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
          onClick={onDelete}
          size="icon"
          variant="ghost"
        >
          <Trash2 className="text-muted-foreground" />
        </Button>
      </ItemActions>

      {isExpanded ? (
        <div className="flex basis-full flex-col gap-3" id={detailsId}>
          <FillUpDetails entry={entry} />
          <PaymentStatus kind="fuel" id={entry.id} isSettled={entry.isSettled} />
        </div>
      ) : null}
    </Item>
  );
}
