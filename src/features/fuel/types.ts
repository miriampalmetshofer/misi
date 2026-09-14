import type { OffsetMode } from "./calculate";

/** A stored fill-up, as the history list needs it. */
export type FuelFillUpEntry = {
  id: string;
  /** Calendar date as yyyy-mm-dd, the same shape <input type="date"> uses. */
  filledOn: string;
  miriamKm: number;
  simonKm: number;
  sharedKm: number;
  carKm: number;
  paidAmount: number;
  offsetMode: OffsetMode;
  miriamAmount: number;
  simonAmount: number;
};
