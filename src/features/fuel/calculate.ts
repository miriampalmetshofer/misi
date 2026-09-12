export const OFFSET_MODES = ["proportional", "shared"] as const;

export type OffsetMode = (typeof OFFSET_MODES)[number];

export type FuelSplitInput = {
  /** Kilometres the tracking device attributes to each driver. */
  miriamKm: number;
  simonKm: number;
  sharedKm: number;
  /** Kilometres the car itself reports for the same period. */
  carKm: number;
  /** Amount paid at the pump, in euros. */
  paidAmount: number;
};

export type FuelSplitResult = {
  /** Sum of the three device readings. */
  deviceKmTotal: number;
  /** Car reading minus device sum: the kilometres the device missed. */
  distanceOffset: number;
  /** Share of the offset relative to the car reading, 0–1. */
  distanceOffsetShare: number;
  /**
   * Shares of the distance, 0–1. The two personal shares plus the shared one
   * sum to 1, so a personal share on its own is NOT what someone pays — half
   * of `sharedDistanceShare` belongs to each of them on top. Use `*BillShare`
   * to describe a person's part of the bill.
   */
  miriamDistanceShare: number;
  simonDistanceShare: number;
  sharedDistanceShare: number;
  /**
   * Share of the bill each person carries — their own distance plus half the
   * shared distance. These two sum to 1 and match the euro amounts below.
   */
  miriamBillShare: number;
  simonBillShare: number;
  /** Euro amounts, unrounded. */
  miriamAmount: number;
  simonAmount: number;
};

/**
 * Splits a fill-up between the two drivers.
 *
 * Both modes give each driver their own kilometres plus half of the shared
 * ("Beide") kilometres. They differ only in where the gap between the device
 * sum and the car's own reading goes:
 *
 * - `proportional` distributes the gap across all three buckets by size, so
 *   everyone absorbs it in the ratio they drove. Because the scale factor is
 *   the same for every bucket it cancels out of the shares entirely — in this
 *   mode `carKm` changes the displayed kilometres but not the euro split.
 * - `shared` assigns the whole gap to the shared bucket, which is then halved.
 *   This is what the original spreadsheet did, so it keeps historical fill-ups
 *   comparable.
 */
export function calculateFuelSplit(
  input: FuelSplitInput,
  mode: OffsetMode,
): FuelSplitResult {
  const { miriamKm, simonKm, sharedKm, carKm, paidAmount } = input;
  const deviceKmTotal = miriamKm + simonKm + sharedKm;
  const distanceOffset = carKm - deviceKmTotal;

  // The reference distance the shares divide by. `shared` measures against the
  // car, `proportional` against the device — under proportional scaling those
  // are the same ratio, and using the device sum keeps it exact.
  const shareBasisKm = mode === "shared" ? carKm : deviceKmTotal;

  // The summaries render the two distances above before a basis exists, so
  // dividing by zero here would put NaN on screen. Every share collapses to 0
  // in that case, which is also what an empty form should read as.
  const share = (km: number) => (shareBasisKm > 0 ? km / shareBasisKm : 0);

  const miriamDistanceShare = share(miriamKm);
  const simonDistanceShare = share(simonKm);
  // In `shared` mode the offset rides along here, which is why the three
  // shares still add up to 1 even though the numerators came from different
  // readings.
  const sharedDistanceShare = share(
    mode === "shared" ? sharedKm + distanceOffset : sharedKm,
  );

  const miriamBillShare = miriamDistanceShare + sharedDistanceShare / 2;
  const simonBillShare = simonDistanceShare + sharedDistanceShare / 2;

  return {
    deviceKmTotal,
    distanceOffset,
    distanceOffsetShare: carKm > 0 ? distanceOffset / carKm : 0,
    miriamDistanceShare,
    simonDistanceShare,
    sharedDistanceShare,
    miriamBillShare,
    simonBillShare,
    miriamAmount: paidAmount * miriamBillShare,
    simonAmount: paidAmount * simonBillShare,
  };
}
