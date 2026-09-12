"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { calculateTanken, type OffsetMode } from "./calculate";
import { parseNumber } from "./parseNumber";

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

  const parsed = {
    kmMiriam: parseNumber(form.kmMiriam),
    kmSimon: parseNumber(form.kmSimon),
    kmBeide: parseNumber(form.kmBeide),
    kmAuto: parseNumber(form.kmAuto),
    bezahlt: parseNumber(form.bezahlt),
  };

  // A field is invalid only once something unreadable is in it; empty just
  // means "not filled in yet" and must not light up the whole form in red.
  const invalidFields = (Object.keys(parsed) as FieldName[]).filter(
    (name) => form[name].trim() !== "" && parsed[name] === null,
  );

  const input = {
    kmMiriam: parsed.kmMiriam ?? 0,
    kmSimon: parsed.kmSimon ?? 0,
    kmBeide: parsed.kmBeide ?? 0,
    kmAuto: parsed.kmAuto ?? 0,
    bezahlt: parsed.bezahlt ?? 0,
  };

  const result = calculateTanken(input, mode);

  // `beide` divides by the car reading, `proportional` by the device sum, so
  // the readiness gate has to follow the basis the active mode actually uses.
  // Otherwise a missing car reading yields a confident "0,00 €" split.
  // A summary that silently treats an unreadable field as 0 is not a partial
  // result, it is a wrong one — "Summe Gerät 626,0 km" looks just as settled
  // as the correct number. Each summary suppresses on its own inputs only.
  const hasInvalidDeviceKm = FIELDS.some((field) =>
    invalidFields.includes(field.name),
  );
  const hasInvalidDistance =
    hasInvalidDeviceKm || invalidFields.includes("kmAuto");

  const basis = mode === "beide" ? input.kmAuto : result.summeGeraet;
  const canCalculate =
    basis > 0 && invalidFields.length === 0 && !result.isInconsistent;

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
                isInvalid={invalidFields.includes(field.name)}
                onChange={update}
              />
            ))}

            <Summary
              label="Summe Gerät"
              value={
                hasInvalidDeviceKm ? "—" : `${km.format(result.summeGeraet)} km`
              }
            />
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
              isInvalid={invalidFields.includes("kmAuto")}
              onChange={update}
            />

            <Summary
              label="Differenz"
              value={
                hasInvalidDistance
                  ? "—"
                  : `${km.format(result.differenz)} km${
                      result.summeGeraet > 0 && input.kmAuto > 0
                        ? ` (${percent.format(result.differenzAnteil)})`
                        : ""
                    }`
              }
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
              isInvalid={invalidFields.includes("bezahlt")}
              onChange={update}
            />
          </section>

          <section aria-labelledby="modus" className="flex flex-col gap-3">
            <h2 className="section-label" id="modus">
              Differenz verteilen
            </h2>

            {/* Native radios rather than buttons with role="radio": arrow-key
                selection and the single tab stop come from the browser, which
                hand-rolled roving tabindex would otherwise have to reproduce.
                The input is visually hidden and its label carries the styling. */}
            <fieldset className="grid grid-cols-2 gap-2">
              <legend className="sr-only">Differenz verteilen</legend>

              {(Object.keys(MODE_LABELS) as OffsetMode[]).map((value) => (
                <label
                  key={value}
                  className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-sm font-medium transition-all select-none has-checked:border-transparent has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50 dark:border-input dark:bg-input/30 dark:has-checked:bg-primary"
                >
                  <input
                    // The visible text sits in the wrapping label, but naming
                    // the input directly keeps it independent of how the
                    // accessible name is computed through sr-only content.
                    aria-label={MODE_LABELS[value]}
                    checked={mode === value}
                    className="sr-only"
                    name="modus"
                    type="radio"
                    value={value}
                    onChange={() => setMode(value)}
                  />
                  {MODE_LABELS[value]}
                </label>
              ))}
            </fieldset>

            {/* The selected mode explains itself here, which is why there is
                no separate info toggle listing both. */}
            <p className="text-sm leading-snug text-muted-foreground">
              {MODE_HINTS[mode]}
            </p>
          </section>

          <section
            aria-labelledby="ergebnis"
            className="rounded-2xl border bg-card p-5 text-card-foreground sm:p-7"
          >
            <h2 className="section-label" id="ergebnis">
              Zu zahlen
            </h2>

            {canCalculate ? (
              <dl className="mt-4 flex flex-col gap-3">
                {/* The share of the bill, not of the distance: a personal
                    distance share excludes the shared kilometres and so would
                    not match the euro amount beside it. */}
                <Share
                  label="Miriam"
                  share={result.zahlAnteilMiriam}
                  amount={result.zahltMiriam}
                />
                <Share
                  label="Simon"
                  share={result.zahlAnteilSimon}
                  amount={result.zahltSimon}
                />
              </dl>
            ) : (
              <p className="text-body-muted mt-4">
                {invalidFields.length > 0
                  ? "Bitte nur Zahlen eintragen, dann erscheint hier die Aufteilung."
                  : result.isInconsistent
                    ? "Das Gerät zählt mehr Kilometer als das Auto. Bitte die Eingaben prüfen."
                    : mode === "beide"
                    ? "Kilometer und Tachostand eintragen, dann erscheint hier die Aufteilung."
                    : "Kilometer eintragen, dann erscheint hier die Aufteilung."}
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
  isInvalid,
  onChange,
}: {
  label: string;
  name: FieldName;
  unit: string;
  value: string;
  isInvalid: boolean;
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
          // Input already styles aria-invalid, so the bad field is marked where
          // it is rather than only in the result panel.
          aria-invalid={isInvalid}
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
