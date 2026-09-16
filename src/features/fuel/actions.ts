"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { calculateFuelSplit, isOffsetMode } from "./calculate";
import { parseNumber } from "./parseNumber";

const FUEL_PATH = "/tanken";

/** Guards against a fat-fingered reading becoming a numeric overflow. */
const MAX_KM = 1_000_000;
const MAX_AMOUNT = 100_000;

export async function addFuelFillUp(formData: FormData) {
  const filledOn = getString(formData, "filledOn");
  const offsetMode = getString(formData, "offsetMode");

  const input = {
    miriamKm: getNumber(formData, "miriamKm"),
    simonKm: getNumber(formData, "simonKm"),
    sharedKm: getNumber(formData, "sharedKm"),
    carKm: getNumber(formData, "carKm"),
    paidAmount: getNumber(formData, "paidAmount"),
  };

  if (
    !isDate(filledOn) ||
    !isOffsetMode(offsetMode) ||
    Object.values(input).some((value) => value === null)
  ) {
    console.error("addFuelFillUp: refused malformed fill-up");
    return;
  }

  const values = input as { [K in keyof typeof input]: number };

  if (
    Object.values(values).some((value) => value < 0) ||
    values.miriamKm > MAX_KM ||
    values.simonKm > MAX_KM ||
    values.sharedKm > MAX_KM ||
    values.carKm > MAX_KM ||
    values.paidAmount > MAX_AMOUNT
  ) {
    console.error("addFuelFillUp: refused out-of-range fill-up");
    return;
  }

  // The device is powered by the car, so it cannot record kilometres the car
  // did not drive. The history divides by `carKm`, so it must also be above 0.
  if (
    values.carKm <= 0 ||
    values.carKm < values.miriamKm + values.simonKm + values.sharedKm
  ) {
    console.error(
      "addFuelFillUp: refused fill-up with implausible car reading",
    );
    return;
  }

  // Recomputed here rather than taken from the form: the amounts on screen are
  // a display of the split, but the stored ones are the record. Deriving them
  // server-side keeps a stored fill-up consistent with its own inputs.
  const result = calculateFuelSplit(values, offsetMode);

  await getDb()
    .insert(schema.fuelFillUps)
    .values({
      filledOn,
      ...values,
      offsetMode,
      // Rounded to the cent on the way in, because that is the amount actually
      // settled — storing 45,459999 would make the pair fail to sum to the bill.
      miriamAmount: toCents(result.miriamAmount),
      simonAmount: toCents(result.simonAmount),
    });

  revalidatePath(FUEL_PATH);
}

export async function deleteFuelFillUp(formData: FormData) {
  const id = getString(formData, "id");

  if (!id) {
    return;
  }

  await getDb()
    .delete(schema.fuelFillUps)
    .where(eq(schema.fuelFillUps.id, id));

  revalidatePath(FUEL_PATH);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Reads a form field written in the app's notation, where "," is the point. */
function getNumber(formData: FormData, key: string) {
  return parseNumber(getString(formData, key));
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function toCents(amount: number) {
  return Math.round(amount * 100) / 100;
}
