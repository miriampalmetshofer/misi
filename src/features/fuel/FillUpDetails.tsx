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
 */
export function FillUpDetails({ entry }: { entry: FuelFillUpEntry }) {
  const result = calculateFuelSplit(entry, entry.offsetMode);

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
