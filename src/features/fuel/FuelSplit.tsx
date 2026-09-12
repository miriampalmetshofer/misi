"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { calculateFuelSplit, type OffsetMode } from "./calculate";
import { parseNumber } from "./parseNumber";

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
  const [useFiftyFifty, setUseFiftyFifty] = useState(false);
  // Initialised lazily so the date comes from the browser's clock rather than
  // the server's, and stays put if the component re-renders around midnight.
  const [datum, setDatum] = useState(today);
  const mode: OffsetMode = useFiftyFifty ? "shared" : "proportional";

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
    miriamKm: parsed.kmMiriam ?? 0,
    simonKm: parsed.kmSimon ?? 0,
    sharedKm: parsed.kmBeide ?? 0,
    carKm: parsed.kmAuto ?? 0,
    paidAmount: parsed.bezahlt ?? 0,
  };

  const result = calculateFuelSplit(input, mode);

  // A summary that silently treats an unreadable field as 0 is not a partial
  // result, it is a wrong one — "Summe Gerät 626,0 km" looks just as settled
  // as the correct number. Each summary suppresses on its own inputs only.
  const hasInvalidDeviceKm = FIELDS.some((field) =>
    invalidFields.includes(field.name),
  );
  const hasInvalidDistance =
    hasInvalidDeviceKm || invalidFields.includes("kmAuto");

  // 50/50 divides by the car reading, `proportional` by the device sum, so the
  // readiness gate has to follow the basis the active mode actually uses.
  // Otherwise a missing car reading yields a confident "0,00 €" split.
  const basis = mode === "shared" ? input.carKm : result.deviceKmTotal;
  const adjustedSharedKm = input.sharedKm + result.distanceOffset;
  // The car reading has to be there before the offset means anything: without
  // it the whole device sum reads as a negative offset, which is a missing
  // entry rather than an impossible 50/50 split.
  const hasImpossibleFiftyFifty =
    mode === "shared" && input.carKm > 0 && adjustedSharedKm < 0;
  const canCalculate =
    basis > 0 && invalidFields.length === 0 && !hasImpossibleFiftyFifty;

  function update(name: FieldName, value: string) {
    // The comma is the decimal separator, but some phone keypads only offer a
    // dot. Turn it into a comma as it is typed, so the field shows the one
    // separator the app accepts instead of silently refusing the entry.
    setForm((current) => ({ ...current, [name]: value.replace(".", ",") }));
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
                hasInvalidDeviceKm ? "—" : `${km.format(result.deviceKmTotal)} km`
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
                  : `${km.format(result.distanceOffset)} km${
                      // The share is relative to the car reading, so without
                      // one there is no percentage to show — only a "0,0 %".
                      input.carKm > 0
                        ? ` (${percent.format(result.distanceOffsetShare)})`
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

            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox
                checked={useFiftyFifty}
                className="size-5 border-muted-foreground"
                onCheckedChange={(checked) => setUseFiftyFifty(!!checked)}
              />
              <span>50/50-Modus verwenden</span>
            </label>

            <p className="text-sm leading-snug text-muted-foreground">
              Standard: proportional nach Geräte-Kilometern. Im 50/50-Modus
              wird die Differenz zwischen Auto und Gerät komplett zu „Beide“
              gerechnet und halbiert.
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
                  share={result.miriamBillShare}
                  amount={result.miriamAmount}
                />
                <Share
                  label="Simon"
                  share={result.simonBillShare}
                  amount={result.simonAmount}
                />
              </dl>
            ) : (
              <p className="text-body-muted mt-4">
                {invalidFields.length > 0
                  ? "Bitte nur Zahlen eintragen, dann erscheint hier die Aufteilung."
                  : hasImpossibleFiftyFifty
                    ? "Die Differenz ist größer als die gemeinsamen Kilometer. 50/50 passt hier nicht; proportional funktioniert weiterhin."
                    : mode === "shared"
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
