"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { euro } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { defaultRange } from "./dateRange";
import { DateRangePicker } from "./DateRangePicker";
import { km, percent } from "./format";
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
  // Lazy, so "three months back" is measured from the browser's clock.
  const [range, setRange] = useState(defaultRange);

  // The picker reports only complete ranges and orders the ends itself, so the
  // period can never be back to front.
  const summary = useMemo(
    () => summarizeFillUps(filterByRange(fillUps, range)),
    [fillUps, range],
  );

  return (
    <div className="mt-8 flex flex-col gap-8 sm:mt-12">
      <section aria-labelledby="zeitraum" className="flex flex-col gap-3">
        <h2 className="section-label" id="zeitraum">
          Zeitraum
        </h2>

        <DateRangePicker value={range} onChange={setRange} />
      </section>

      {summary.fillUpCount === 0 ? (
        <p className="text-body-muted">
          In diesem Zeitraum gibt es keine Tankfüllungen.
        </p>
      ) : (
        <>
          {/* First on the page: the split is what the overview is for. Set at
              the same size the calculator gives its euro amounts, which is
              this app's "headline value of a card". */}
          <Panel
            label="Anteile"
            footer={
              <details className="group mt-4 border-t pt-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 group-open:rotate-180"
                  />
                  Kilometer &amp; Kosten
                </summary>
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="text-left align-bottom">
                      <th scope="col" className="pr-2 font-medium">Person</th>
                      <th scope="col" className="px-2 text-right font-medium">
                        Kilometer
                        <span className="block text-xs">
                          (inkl. Anteil gemeinsamer Fahrten)
                        </span>
                      </th>
                      <th scope="col" className="pl-2 text-right font-medium">
                        Kostenanteil
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    <tr>
                      <th scope="row" className="py-2 pr-2 text-left font-normal">
                        Miriam
                      </th>
                      <td className="whitespace-nowrap px-2 text-right">
                        {km.format(summary.miriamAllocatedKm)} km
                      </td>
                      <td className="whitespace-nowrap pl-2 text-right">
                        {euro.format(summary.miriamPaid)}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row" className="py-2 pr-2 text-left font-normal">
                        Simon
                      </th>
                      <td className="whitespace-nowrap px-2 text-right">
                        {km.format(summary.simonAllocatedKm)} km
                      </td>
                      <td className="whitespace-nowrap pl-2 text-right">
                        {euro.format(summary.simonPaid)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </details>
            }
          >
            <ShareOfBill label="Miriam" share={summary.miriamPaidShare} />
            <ShareOfBill label="Simon" share={summary.simonPaidShare} />
          </Panel>

          <Panel label="Gesamt">
            <Row label="Anzahl Tankungen" value={String(summary.fillUpCount)} />
            <Row
              label="Erste Tankung"
              value={
                summary.firstFilledOn ? formatDate(summary.firstFilledOn) : "—"
              }
            />
            <Row
              label="Letzte Tankung"
              value={
                summary.lastFilledOn ? formatDate(summary.lastFilledOn) : "—"
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
  footer,
}: {
  label: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 text-card-foreground sm:p-7">
      <h2 className="section-label">{label}</h2>
      <dl className="mt-4 flex flex-col gap-3">{children}</dl>
      {footer}
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
