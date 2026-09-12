export const OFFSET_MODES = ["proportional", "beide"] as const;

export type OffsetMode = (typeof OFFSET_MODES)[number];

export type TankenInput = {
  /** Kilometres the tracking device attributes to each driver. */
  kmMiriam: number;
  kmSimon: number;
  kmBeide: number;
  /** Kilometres the car itself reports for the same period. */
  kmAuto: number;
  /** Amount paid at the pump, in euros. */
  bezahlt: number;
};

export type TankenResult = {
  /** Sum of the three device readings. */
  summeGeraet: number;
  /** Car reading minus device sum: the kilometres the device missed. */
  differenz: number;
  /** Share of the offset relative to the car reading, 0–1. */
  differenzAnteil: number;
  /**
   * Shares of the distance, 0–1. The two personal shares plus the shared one
   * sum to 1, so a personal share on its own is NOT what someone pays — half
   * of `anteilBeide` belongs to each of them on top. Use `zahlAnteil*` to
   * describe a person's part of the bill.
   */
  anteilMiriam: number;
  anteilSimon: number;
  anteilBeide: number;
  /**
   * Share of the bill each person carries — their own distance plus half the
   * shared distance. These two sum to 1 and match the euro amounts below.
   */
  zahlAnteilMiriam: number;
  zahlAnteilSimon: number;
  /** Euro amounts, unrounded. */
  zahltMiriam: number;
  zahltSimon: number;
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
 *   mode `kmAuto` changes the displayed kilometres but not the euro split.
 * - `beide` assigns the whole gap to the shared bucket, which is then halved.
 *   This is what the original spreadsheet did, so it keeps historical
 *   fill-ups comparable.
 */
export function calculateTanken(
  input: TankenInput,
  mode: OffsetMode,
): TankenResult {
  const { kmMiriam, kmSimon, kmBeide, kmAuto, bezahlt } = input;
  const summeGeraet = kmMiriam + kmSimon + kmBeide;

  // The reference distance the shares divide by. `beide` measures against the
  // car, `proportional` against the device — under proportional scaling those
  // are the same ratio, and using the device sum keeps it exact.
  const basis = mode === "beide" ? kmAuto : summeGeraet;

  if (basis <= 0) {
    return {
      summeGeraet,
      differenz: kmAuto - summeGeraet,
      differenzAnteil: 0,
      anteilMiriam: 0,
      anteilSimon: 0,
      anteilBeide: 0,
      zahlAnteilMiriam: 0,
      zahlAnteilSimon: 0,
      zahltMiriam: 0,
      zahltSimon: 0,
    };
  }

  const anteilMiriam = kmMiriam / basis;
  const anteilSimon = kmSimon / basis;
  // In `beide` mode the offset rides along here, which is why the three shares
  // still add up to 1 even though the numerators came from different readings.
  const anteilBeide =
    mode === "beide" ? (kmAuto - summeGeraet + kmBeide) / basis : kmBeide / basis;

  const zahlAnteilMiriam = anteilMiriam + anteilBeide / 2;
  const zahlAnteilSimon = anteilSimon + anteilBeide / 2;

  return {
    summeGeraet,
    differenz: kmAuto - summeGeraet,
    differenzAnteil: kmAuto > 0 ? (kmAuto - summeGeraet) / kmAuto : 0,
    anteilMiriam,
    anteilSimon,
    anteilBeide,
    zahlAnteilMiriam,
    zahlAnteilSimon,
    zahltMiriam: bezahlt * zahlAnteilMiriam,
    zahltSimon: bezahlt * zahlAnteilSimon,
  };
}
