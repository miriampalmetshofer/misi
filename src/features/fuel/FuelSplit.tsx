"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { addFuelFillUp, deleteFuelFillUp } from "./actions";
import { euro, km, percent } from "./format";
import { FuelHistory } from "./FuelHistory";
import type { FuelFillUpEntry } from "./types";
import { FIELDS, useFuelSplitForm, type FieldName } from "./useFuelSplitForm";

type FuelSplitProps = {
  /** Past fill-ups, newest first. Empty until the page loads them. */
  fillUps?: FuelFillUpEntry[];
};

/**
 * Writes wait for the server, unlike the shopping list's.
 *
 * A fill-up is entered once at the pump and considered, not rattled off in a
 * burst, so the round-trip costs nothing worth optimising away — and in return
 * the history only ever shows rows the database really has. Both writes show
 * their progress instead: the save on its button, the delete in its dialog.
 */
export function FuelSplit({ fillUps = [] }: FuelSplitProps) {
  const form = useFuelSplitForm();
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  function save() {
    if (!form.canSave) {
      return;
    }

    const { input, datum, mode } = form;

    startSaving(async () => {
      await addFuelFillUp(
        toFormData({
          filledOn: datum,
          offsetMode: mode,
          miriamKm: toField(input.miriamKm),
          simonKm: toField(input.simonKm),
          sharedKm: toField(input.sharedKm),
          carKm: toField(input.carKm),
          paidAmount: toField(input.paidAmount),
        }),
      );

      form.reset();
    });
  }

  function deleteFillUp(id: string) {
    startDeleting(async () => {
      await deleteFuelFillUp(toFormData({ id }));
    });
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
              value={form.datum}
              onChange={(event) => form.setDatum(event.target.value)}
            />
          </label>

          <section aria-labelledby="geraet" className="flex flex-col gap-3">
            <h2 className="section-label" id="geraet">
              Gerät
            </h2>

            {FIELDS.map((field) => (
              <NumberField
                key={field.name}
                label={field.label}
                name={field.name}
                unit="km"
                value={form.form[field.name]}
                isInvalid={form.invalidFields.includes(field.name)}
                onChange={form.update}
              />
            ))}

            <Summary
              label="Summe"
              value={
                form.hasInvalidDeviceKm
                  ? "—"
                  : `${km.format(form.result.deviceKmTotal)} km`
              }
            />
          </section>

          <section aria-labelledby="auto" className="flex flex-col gap-3">
            <h2 className="section-label" id="auto">
              Tachostand
            </h2>

            <NumberField
              label="Auto"
              name="kmAuto"
              unit="km"
              value={form.form.kmAuto}
              isInvalid={form.invalidFields.includes("kmAuto")}
              onChange={form.update}
            />

            <Summary
              label="Nicht erfasst"
              value={
                form.hasInvalidDistance
                  ? "—"
                  : `${km.format(form.result.distanceOffset)} km${
                      // The share is relative to the car reading, so without
                      // one there is no percentage to show — only a "0,0 %".
                      form.input.carKm > 0
                        ? ` (${percent.format(form.result.distanceOffsetShare)})`
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
              value={form.form.bezahlt}
              isInvalid={form.invalidFields.includes("bezahlt")}
              onChange={form.update}
            />
          </section>

          <section aria-labelledby="modus" className="flex flex-col gap-3">
            <h2 className="section-label" id="modus">
              Nicht erfasste Kilometer verteilen
            </h2>

            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox
                checked={form.useFiftyFifty}
                className="size-5 border-muted-foreground"
                onCheckedChange={(checked) => form.setUseFiftyFifty(!!checked)}
              />
              <span>50/50-Modus verwenden</span>
            </label>

            <p className="text-sm leading-snug text-muted-foreground">
              Standard: proportional nach Geräte-Kilometern. Im 50/50-Modus
              werden die nicht erfassten Kilometer komplett zu „Gemeinsam“
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

            {form.canCalculate ? (
              <dl className="mt-4 flex flex-col gap-3">
                {/* The share of the bill, not of the distance: a personal
                    distance share excludes the shared kilometres and so would
                    not match the euro amount beside it. */}
                <Share
                  label="Miriam"
                  share={form.result.miriamBillShare}
                  amount={form.result.miriamAmount}
                />
                <Share
                  label="Simon"
                  share={form.result.simonBillShare}
                  amount={form.result.simonAmount}
                />
              </dl>
            ) : (
              <p className="text-body-muted mt-4">
                {form.invalidFields.length > 0
                  ? "Bitte nur Zahlen eintragen, dann erscheint hier die Aufteilung."
                  : form.hasImpossibleFiftyFifty
                    ? "Es sind mehr Kilometer erfasst als das Auto zählt. 50/50 passt hier nicht; proportional funktioniert weiterhin."
                    : form.mode === "shared"
                      ? "Kilometer und Tachostand eintragen, dann erscheint hier die Aufteilung."
                      : "Kilometer eintragen, dann erscheint hier die Aufteilung."}
              </p>
            )}

            <Button
              className="mt-5 w-full"
              disabled={!form.canSave || isSaving}
              onClick={save}
              size="lg"
            >
              {isSaving ? "Wird gespeichert …" : "Speichern"}
            </Button>
          </section>

          <FuelHistory
            entries={fillUps}
            isDeleting={isDeleting}
            onDelete={deleteFillUp}
          />
        </div>
      </main>
    </div>
  );
}

/** Renders a number the way the form writes it, so the action can re-parse it. */
function toField(value: number) {
  return String(value).replace(".", ",");
}

function toFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
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
