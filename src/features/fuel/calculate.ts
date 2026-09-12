export const OFFSET_MODES = ["proportional", "shared"] as const;

export type OffsetMode = (typeof OFFSET_MODES)[number];

/** Kilometres the tracking device attributes to each driver. */
export type DeviceKm = {
  miriamKm: number;
  simonKm: number;
  sharedKm: number;
};

export type FuelSplitInput = DeviceKm & {
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
   * Shares of the distance, 0–1. All three sum to 1 in either mode, so a
   * personal share on its own is NOT what someone pays — half of
   * `sharedDistanceShare` is added to each of them on top, again in either
   * mode. Use `*BillShare` for a person's part of the bill.
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
 * The tracking device misses trips the car itself counted, so its three
 * readings usually add up to less than the car's own reading. Those missing
 * kilometres were still driven and still cost fuel, so somebody has to pay for
 * them. The mode decides who:
 *
 * - `proportional` shares the gap out in the ratio everyone drove. It scales
 *   all three readings by the same factor, so the factor cancels out and the
 *   euro split is unchanged — here `carKm` only moves the displayed kilometres.
 * - `shared` puts the whole gap on the shared bucket, which is then halved.
 *   This is what the original spreadsheet did, so it keeps historical fill-ups
 *   comparable.
 *
 * Either way each driver pays for their own kilometres plus half the shared
 * ones.
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
