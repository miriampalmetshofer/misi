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

// Client-only: a row that has been saved but whose insert has not come back
// yet. The server never sets this, so it stays off the type it returns.
export type OptimisticFuelFillUpEntry = FuelFillUpEntry & {
  isSyncing?: boolean;
};
