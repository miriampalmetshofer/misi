/** The two views the Tanken page offers, in the order the tabs show them. */
export const VIEWS = [
  { id: "berechnen", label: "Berechnen", href: "/tanken" },
  { id: "uebersicht", label: "Übersicht", href: "/tanken?ansicht=uebersicht" },
] as const;

export type FuelView = (typeof VIEWS)[number]["id"];

/**
 * Reads the view out of the `ansicht` query parameter.
 *
 * Anything unrecognised falls back to the calculator, so a hand-edited URL
 * lands on a working page rather than on an empty one.
 */
export function viewFromParam(value: string | string[] | undefined): FuelView {
  return value === "uebersicht" ? "uebersicht" : "berechnen";
}
