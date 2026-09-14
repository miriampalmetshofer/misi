"use client";

import { useState } from "react";

import { calculateFuelSplit, type OffsetMode } from "./calculate";
import { parseNumber } from "./parseNumber";

export const FIELDS = [
  { name: "kmMiriam", label: "Miriam" },
  { name: "kmSimon", label: "Simon" },
  { name: "kmBeide", label: "Gemeinsam" },
] as const;

export type FieldName =
  | (typeof FIELDS)[number]["name"]
  | "kmAuto"
  | "bezahlt";

const EMPTY_FORM: Record<FieldName, string> = {
  kmMiriam: "",
  kmSimon: "",
  kmBeide: "",
  kmAuto: "",
  bezahlt: "",
};

/** Today as yyyy-mm-dd in local time, which is what <input type="date"> wants. */
export function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Holds the calculator's form state and everything derived from it.
 *
 * Split out of the component because saving needs exactly the same derivation
 * the display does — whether the numbers are readable, whether there is enough
 * to calculate, and what the split comes to. Two copies of that logic would be
 * two chances for the stored fill-up to disagree with the one on screen.
 */
export function useFuelSplitForm() {
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
  // result, it is a wrong one — "Summe 626,0 km" looks just as settled
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

  // Saving a fill-up nobody paid for would put a 0,00 € row in the history,
  // so the amount has to be there on top of everything the display needs.
  const canSave = canCalculate && input.paidAmount > 0;

  function update(name: FieldName, value: string) {
    // The comma is the decimal separator, but some phone keypads only offer a
    // dot. Turn it into a comma as it is typed, so the field shows the one
    // separator the app accepts instead of silently refusing the entry.
    setForm((current) => ({ ...current, [name]: value.replace(".", ",") }));
  }

  function reset() {
    setForm(EMPTY_FORM);
    setUseFiftyFifty(false);
    setDatum(today());
  }

  return {
    form,
    datum,
    setDatum,
    useFiftyFifty,
    setUseFiftyFifty,
    mode,
    input,
    result,
    invalidFields,
    hasInvalidDeviceKm,
    hasInvalidDistance,
    hasImpossibleFiftyFifty,
    canCalculate,
    canSave,
    update,
    reset,
  };
}
