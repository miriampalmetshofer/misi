"use client";

import Link from "next/link";
import { ChevronLeft, Info } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateTanken, type OffsetMode } from "./calculate";

const MODE_LABELS: Record<OffsetMode, string> = {
  proportional: "Proportional",
  beide: "50/50",
};

const MODE_HINTS: Record<OffsetMode, string> = {
  proportional:
    "Die Differenz wird nach gefahrenen Kilometern verteilt: Wer mehr gefahren ist, übernimmt mehr davon.",
  beide: "Die Differenz zählt komplett zu „Beide“ und wird halbe-halbe geteilt.",
};

const FIELDS = [
  { name: "kmMiriam", label: "Miriam" },
  { name: "kmSimon", label: "Simon" },
  { name: "kmBeide", label: "Beide" },
] as const;

type FieldName = (typeof FIELDS)[number]["name"] | "kmAuto" | "bezahlt";

const EMPTY_FORM: Record<FieldName, string> = {
  kmMiriam: "",
  kmSimon: "",
  kmBeide: "",
  kmAuto: "",
  bezahlt: "",
};

const km = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const percent = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Accepts both "256,4" and "256.4", since phone keyboards offer either. */
function toNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Today as yyyy-mm-dd in local time, which is what <input type="date"> wants. */
function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function FuelSplit() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState<OffsetMode>("proportional");
  // Initialised lazily so the date comes from the browser's clock rather than
  // the server's, and stays put if the component re-renders around midnight.
  const [datum, setDatum] = useState(today);
  const [isHintOpen, setIsHintOpen] = useState(false);

  const input = {
    kmMiriam: toNumber(form.kmMiriam),
    kmSimon: toNumber(form.kmSimon),
    kmBeide: toNumber(form.kmBeide),
    kmAuto: toNumber(form.kmAuto),
    bezahlt: toNumber(form.bezahlt),
  };

  const result = calculateTanken(input, mode);
  const hasKilometres = result.summeGeraet > 0;

  function update(name: FieldName, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="min-h-screen bg-background text-base text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <Link href="/" className="page-back-link">
          <ChevronLeft aria-hidden="true" className="size-4" />
          <span>Home</span>
        </Link>

        <h1 className="page-headline">Tanken</h1>

        <div className="mt-8 flex flex-col gap-8 sm:mt-12">
          <label className="flex items-center justify-between gap-3">
            <span>Datum</span>
            <Input
              className="w-40 tabular-nums"
              name="datum"
              type="date"
              value={datum}
              onChange={(event) => setDatum(event.target.value)}
            />
          </label>

          <section aria-labelledby="geraet" className="flex flex-col gap-3">
            <h2 className="section-label" id="geraet">
              Laut Gerät
            </h2>

            {FIELDS.map((field) => (
              <NumberField
                key={field.name}
                label={field.label}
                name={field.name}
                unit="km"
                value={form[field.name]}
                onChange={update}
              />
            ))}

            <Summary label="Summe Gerät" value={`${km.format(result.summeGeraet)} km`} />
          </section>

          <section aria-labelledby="auto" className="flex flex-col gap-3">
            <h2 className="section-label" id="auto">
              Laut Auto
            </h2>

            <NumberField
              label="Gesamt"
              name="kmAuto"
              unit="km"
              value={form.kmAuto}
              onChange={update}
            />

            <Summary
              label="Differenz"
              value={`${km.format(result.differenz)} km${
                hasKilometres && input.kmAuto > 0
                  ? ` (${percent.format(result.differenzAnteil)})`
                  : ""
              }`}
            />
          </section>

          <section aria-labelledby="betrag" className="flex flex-col gap-3">
            <h2 className="section-label" id="betrag">
              Bezahlt
            </h2>

            <NumberField
              label="Betrag"
              name="bezahlt"
              unit="€"
              value={form.bezahlt}
              onChange={update}
            />
          </section>

          <section aria-labelledby="modus" className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <h2 className="section-label" id="modus">
                Differenz verteilen
              </h2>

              <Button
                variant="ghost"
                size="icon-xs"
                aria-controls="modus-info"
                aria-expanded={isHintOpen}
                aria-label="Erklärung der Modi anzeigen"
                className="rounded-full text-muted-foreground"
                onClick={() => setIsHintOpen((open) => !open)}
              >
                <Info aria-hidden="true" />
              </Button>
            </div>

            <div
              aria-labelledby="modus"
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
            >
              {(Object.keys(MODE_LABELS) as OffsetMode[]).map((value) => (
                <Button
                  key={value}
                  role="radio"
                  aria-checked={mode === value}
                  variant={mode === value ? "default" : "outline"}
                  size="lg"
                  onClick={() => setMode(value)}
                >
                  {MODE_LABELS[value]}
                </Button>
              ))}
            </div>

            {isHintOpen ? (
              <dl
                className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-sm leading-snug text-muted-foreground"
                id="modus-info"
              >
                {(Object.keys(MODE_LABELS) as OffsetMode[]).map((value) => (
                  <div key={value}>
                    <dt className="font-semibold text-card-foreground">
                      {MODE_LABELS[value]}
                    </dt>
                    <dd>{MODE_HINTS[value]}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm leading-snug text-muted-foreground">
                {MODE_HINTS[mode]}
              </p>
            )}
          </section>

          <section
            aria-labelledby="ergebnis"
            className="rounded-2xl border bg-card p-5 text-card-foreground sm:p-7"
          >
            <h2 className="section-label" id="ergebnis">
              Zu zahlen
            </h2>

            {hasKilometres ? (
              <>
                {/* The note below is about the list as a whole, so it stays
                    outside the <dl>, which may only hold dt/dd groups. */}
                <dl className="mt-4 flex flex-col gap-3">
                  <Share
                    label="Miriam"
                    share={result.anteilMiriam}
                    amount={result.zahltMiriam}
                  />
                  <Share
                    label="Simon"
                    share={result.anteilSimon}
                    amount={result.zahltSimon}
                  />
                </dl>

                <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                  Enthält die gemeinsamen{" "}
                  {percent.format(result.anteilBeide)}, je zur Hälfte auf beide
                  aufgeteilt.
                </p>
              </>
            ) : (
              <p className="text-body-muted mt-4">
                Kilometer eintragen, dann erscheint hier die Aufteilung.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between border-t pt-3 text-sm text-muted-foreground sm:text-base">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </p>
  );
}

function Share({
  label,
  share,
  amount,
}: {
  label: string;
  share: number;
  amount: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="sm:text-lg">
        {label}{" "}
        <span className="text-sm text-muted-foreground">
          {percent.format(share)}
        </span>
      </dt>
      <dd className="text-lg font-bold tabular-nums sm:text-xl">
        {euro.format(amount)}
      </dd>
    </div>
  );
}

function NumberField({
  label,
  name,
  unit,
  value,
  onChange,
}: {
  label: string;
  name: FieldName;
  unit: string;
  value: string;
  onChange: (name: FieldName, value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="flex items-baseline gap-1.5">
        <Input
          // The label element also holds the unit, so name the input directly
          // rather than letting the unit leak into its accessible name.
          aria-label={label}
          className="w-28 text-right tabular-nums sm:w-32"
          // `decimal` gives phones a comma/period keypad; `type=text` keeps the
          // raw string so a half-typed "256," is not discarded by the browser.
          inputMode="decimal"
          name={name}
          placeholder="0"
          type="text"
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
        />
        <span className="w-4 text-sm text-muted-foreground">{unit}</span>
      </span>
    </label>
  );
}
