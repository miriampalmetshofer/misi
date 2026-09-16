import { calculateFuelSplit } from "./calculate";
import { km, percent } from "./format";
import type { FuelFillUpEntry } from "./types";

const MODE_LABELS = {
  proportional: "Proportional",
  shared: "50/50",
} as const;

/**
 * The readings a fill-up was calculated from, under the row that summarises it.
 *
 * The shares are recomputed rather than stored: they are a view of the same
 * numbers the euro amounts came from, and storing them would be a second copy
 * to keep in step. The amounts themselves stay as they were saved — those are
 * what was actually settled between the two of them.
 */
export function FillUpDetails({ entry }: { entry: FuelFillUpEntry }) {
  const result = calculateFuelSplit(entry, entry.offsetMode);

  /**
   * Each row's share of the car's own distance.
   *
   * Measured against `carKm` rather than through the calculator's distance
   * shares, because those follow the mode: in 50/50 the unrecorded kilometres
   * are folded into the shared share, which would print "300,0 km 53,6 %" as
   * "300,0 km 64,3 %" — a percentage of a distance other than the number
   * beside it. Against the car reading every row describes its own kilometres,
   * and the four of them add up to the whole trip in either mode.
   *
   * These are shares of the distance, not of the bill: nobody pays 24,4 %.
   * What each person owes is on the row above, in euros.
   */
  // `addFuelFillUp` refuses a `carKm` of 0, so there is nothing to guard.
  const share = (value: number) => value / entry.carKm;

  return (
    <dl className="flex basis-full flex-col gap-1.5 border-t pt-3 text-sm">
      <Row
        label="Miriam"
        value={km.format(entry.miriamKm)}
        share={share(entry.miriamKm)}
      />
      <Row
        label="Simon"
        value={km.format(entry.simonKm)}
        share={share(entry.simonKm)}
      />
      <Row
        label="Gemeinsam"
        value={km.format(entry.sharedKm)}
        share={share(entry.sharedKm)}
      />
      <Row
        label="Nicht erfasst"
        value={km.format(result.distanceOffset)}
        share={share(result.distanceOffset)}
      />
      {/* Last of the distances, because the four rows above are its parts:
          they add up to exactly this number, and to 100 %. */}
      <Row label="Auto" value={km.format(entry.carKm)} />
      <Row label="Verteilt" unit="" value={MODE_LABELS[entry.offsetMode]} />
    </dl>
  );
}

function Row({
  label,
  value,
  unit = "km",
  share,
}: {
  label: string;
  value: string;
  unit?: string;
  share?: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">
        {value}
        {unit ? ` ${unit}` : ""}
        {share === undefined ? null : (
          <span className="ml-2 text-muted-foreground">
            {percent.format(share)}
          </span>
        )}
      </dd>
    </div>
  );
}
