"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defaultRange, DEFAULT_RANGE_MONTHS } from "./dateRange";
import { euro, formatFillUpDate, km, percent } from "./format";
import { filterByRange, summarizeFillUps } from "./summarize";
import type { FuelFillUpEntry } from "./types";

type FuelOverviewProps = {
  fillUps: FuelFillUpEntry[];
};

/**
 * Totals the fill-ups in a chosen period.
 *
 * The filtering runs here rather than on the server: the page already holds
 * every fill-up for the history, so narrowing them is a slice of an array in
 * memory. A round-trip per date keystroke would buy nothing.
 */
export function FuelOverview({ fillUps }: FuelOverviewProps) {
  // Lazily initialised so "three months back" is measured from the browser's
  // clock, the same way the calculator's date field is.
  const [range, setRange] = useState(defaultRange);

  const isReversed = range.from > range.to;

  const summary = useMemo(
    // A reversed range matches nothing, and summing it would show a confident
    // set of zeroes. The panel says what is wrong instead, so this is skipped.
    () => (isReversed ? null : summarizeFillUps(filterByRange(fillUps, range))),
    [fillUps, range, isReversed],
  );

  return (
    <div className="mt-8 flex flex-col gap-8 sm:mt-12">
      <section aria-labelledby="zeitraum" className="flex flex-col gap-3">
        <h2 className="section-label" id="zeitraum">
          Zeitraum
        </h2>

        <label className="flex items-center justify-between gap-3">
          <span>Von</span>
          <Input
            aria-invalid={isReversed}
            className="w-40 tabular-nums"
            type="date"
            value={range.from}
            onChange={(event) =>
              setRange((current) => ({ ...current, from: event.target.value }))
            }
          />
        </label>

        <label className="flex items-center justify-between gap-3">
          <span>Bis</span>
          <Input
            aria-invalid={isReversed}
            className="w-40 tabular-nums"
            type="date"
            value={range.to}
            onChange={(event) =>
              setRange((current) => ({ ...current, to: event.target.value }))
            }
          />
        </label>

        <Button
          className="self-start"
          onClick={() => setRange(defaultRange())}
          size="sm"
          variant="outline"
        >
          Letzte {DEFAULT_RANGE_MONTHS} Monate
        </Button>
      </section>

      {isReversed ? (
        <p className="text-body-muted">
          Das Startdatum liegt nach dem Enddatum.
        </p>
      ) : summary === null || summary.fillUpCount === 0 ? (
        <p className="text-body-muted">
          In diesem Zeitraum gibt es keine Tankfüllungen.
        </p>
      ) : (
        <>
          {/* First on the page: the split is what the overview is for. Set at
              the same size the calculator gives its euro amounts, which is
              this app's "headline value of a card". */}
          <Panel label="Anteile">
            <ShareOfBill label="Miriam" share={summary.miriamPaidShare} />
            <ShareOfBill label="Simon" share={summary.simonPaidShare} />
          </Panel>

          <Panel label="Gesamt">
            <Row label="Anzahl Tankungen" value={String(summary.fillUpCount)} />
            <Row
              label="Erste Tankung"
              value={
                summary.firstFilledOn
                  ? formatFillUpDate(summary.firstFilledOn)
                  : "—"
              }
            />
            <Row
              label="Letzte Tankung"
              value={
                summary.lastFilledOn
                  ? formatFillUpDate(summary.lastFilledOn)
                  : "—"
              }
            />
            <Row
              label="Gefahrene km (laut Auto)"
              value={`${km.format(summary.carKmTotal)} km`}
            />
          </Panel>

          <Panel label="Durchschnitt pro Tankung">
            <Row label="Betrag" value={euro.format(summary.averagePaid)} />
            <Row
              label="Kilometer"
              value={`${km.format(summary.averageCarKm)} km`}
            />
          </Panel>
        </>
      )}
    </div>
  );
}

function Panel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 text-card-foreground sm:p-7">
      <h2 className="section-label">{label}</h2>
      <dl className="mt-4 flex flex-col gap-3">{children}</dl>
    </section>
  );
}

function ShareOfBill({ label, share }: { label: string; share: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="sm:text-lg">{label}</dt>
      <dd className="text-lg font-bold tabular-nums sm:text-xl">
        {percent.format(share)}
      </dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
