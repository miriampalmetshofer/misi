"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PaymentSettledMark,
  PaymentStatus,
} from "@/features/payments/PaymentStatus";
import { euro } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { toField, type CarExpenseEntry } from "./expense";

export function ExpenseRow({
  entry,
  isEditing,
  onEdit,
}: {
  entry: CarExpenseEntry;
  isEditing: boolean;
  onEdit: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = useId();

  return (
    <li className="flex flex-col gap-3 rounded-xl border p-4 sm:p-5">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={isExpanded ? detailsId : undefined}
        className="flex w-full items-center gap-3 text-left"
        onClick={() => setIsExpanded((open) => !open)}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="text-sm text-muted-foreground">
              {formatDate(entry.spentOn)}
            </span>
            <span className="inline-flex items-center gap-2 font-semibold tabular-nums">
              {euro.format(entry.totalAmount)}
              {entry.isSettled ? <PaymentSettledMark /> : null}
            </span>
          </span>
          <span className="font-medium break-words">{entry.description}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      <div hidden={!isExpanded} id={detailsId}>
        <div className="flex flex-col gap-3">
          <dl className="grid gap-1 border-t pt-3 text-sm text-muted-foreground">
            <div className="flex justify-between gap-2">
              <dt>Miriam · {toField(entry.miriamPercent)} %</dt>
              <dd className="tabular-nums">
                {euro.format(entry.miriamAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>
                Simon ·{" "}
                {toField(Math.round((100 - entry.miriamPercent) * 100) / 100)} %
              </dt>
              <dd className="tabular-nums">{euro.format(entry.simonAmount)}</dd>
            </div>
          </dl>
          {entry.note ? (
            <p className="text-sm text-muted-foreground break-words">
              {entry.note}
            </p>
          ) : null}
          <PaymentStatus
            kind="expense"
            id={entry.id}
            isSettled={entry.isSettled}
          />
          <Button
            variant="outline"
            className="self-start"
            disabled={isEditing}
            onClick={onEdit}
            aria-label={`${entry.description} bearbeiten`}
          >
            Bearbeiten
          </Button>
        </div>
      </div>
    </li>
  );
}
