export type FuelView = "berechnen" | "uebersicht";

/**
 * Reads the view out of the `ansicht` query parameter.
 *
 * Anything unrecognised falls back to the calculator, so a hand-edited URL
 * lands on a working page rather than on an empty one.
 */
export function viewFromParam(value: string | string[] | undefined): FuelView {
  return value === "uebersicht" ? "uebersicht" : "berechnen";
}
