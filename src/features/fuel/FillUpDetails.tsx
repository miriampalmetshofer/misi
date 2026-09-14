import { calculateFuelSplit } from "./calculate";
import { euro, km, percent } from "./format";
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
  // In 50/50 mode the unrecorded kilometres are folded into the shared share,
  // so the percentage would describe a larger distance than the number next to
  // it — "300,0 km 64,3 %" of 560. The two rows below already say where those
  // kilometres went, so the shares are left off rather than shown mismatched.
  const showShares = entry.offsetMode === "proportional";

  return (
    <dl className="flex basis-full flex-col gap-1.5 border-t pt-3 text-sm">
      <Row
        label="Miriam"
        value={km.format(entry.miriamKm)}
        share={showShares ? result.miriamDistanceShare : undefined}
      />
      <Row
        label="Simon"
        value={km.format(entry.simonKm)}
        share={showShares ? result.simonDistanceShare : undefined}
      />
      <Row
        label="Gemeinsam"
        value={km.format(entry.sharedKm)}
        share={showShares ? result.sharedDistanceShare : undefined}
      />
      <Row label="Auto" value={km.format(entry.carKm)} />
      <Row
        label="Nicht erfasst"
        value={km.format(result.distanceOffset)}
        // Relative to the car reading, so without one there is no percentage
        // to show — only a misleading "0,0 %".
        share={entry.carKm > 0 ? result.distanceOffsetShare : undefined}
      />
      <Row label="Bezahlt" unit="" value={euro.format(entry.paidAmount)} />
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
