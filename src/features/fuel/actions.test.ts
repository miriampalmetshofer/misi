import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These tests cover the action's gate: what it refuses, and what it derives
 * before writing. The database itself is mocked down to the insert call, so
 * this stays a unit test — the e2e suite is what proves the write lands.
 */
const db = vi.hoisted(() => {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn(() => ({ values }));
  const where = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn(() => ({ where }));

  return { values, insert, where, del };
});

vi.mock("@/db", async () => {
  const schema = await vi.importActual<typeof import("@/db/schema")>(
    "@/db/schema",
  );

  return {
    schema,
    getDb: () => ({ insert: db.insert, delete: db.del }),
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { addFuelFillUp, deleteFuelFillUp } from "./actions";

function form(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

const VALID = {
  filledOn: "2025-11-04",
  offsetMode: "proportional",
  miriamKm: "256,4",
  simonKm: "352,2",
  sharedKm: "273,8",
  carKm: "1052,4",
  paidAmount: "102",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("addFuelFillUp", () => {
  it("stores the inputs alongside the split it derives from them", async () => {
    await addFuelFillUp(form(VALID));

    expect(db.values).toHaveBeenCalledWith({
      filledOn: "2025-11-04",
      offsetMode: "proportional",
      miriamKm: 256.4,
      simonKm: 352.2,
      sharedKm: 273.8,
      carKm: 1052.4,
      paidAmount: 102,
      // Recomputed server-side and rounded to the cent, so the two amounts
      // add up to the bill rather than to 101,999998.
      miriamAmount: 45.46,
      simonAmount: 56.54,
    });
  });

  it("applies the 50/50 rule when that mode is submitted", async () => {
    await addFuelFillUp(form({ ...VALID, offsetMode: "shared" }));

    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({ miriamAmount: 46.36, simonAmount: 55.64 }),
    );
  });

  it.each([
    ["an unreadable number", { paidAmount: "hundert" }],
    ["a missing number", { carKm: "" }],
    ["a mode it does not know", { offsetMode: "fifty-fifty" }],
    ["a malformed date", { filledOn: "04.11.2025" }],
    ["an impossible date", { filledOn: "2025-13-45" }],
    ["a negative amount", { paidAmount: "-5" }],
  ])("refuses %s", async (_label, override) => {
    await addFuelFillUp(form({ ...VALID, ...override }));

    expect(db.insert).not.toHaveBeenCalled();
  });

  it("refuses a reading far past anything the column can hold", async () => {
    // numeric(10,1) tops out well below this; refusing beats a database error.
    await addFuelFillUp(form({ ...VALID, carKm: "99999999" }));

    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("deleteFuelFillUp", () => {
  it("deletes the row it was given", async () => {
    await deleteFuelFillUp(form({ id: "11111111-1111-1111-1111-111111111111" }));

    expect(db.del).toHaveBeenCalled();
  });

  it("does nothing without an id", async () => {
    await deleteFuelFillUp(form({}));

    expect(db.del).not.toHaveBeenCalled();
  });
});
