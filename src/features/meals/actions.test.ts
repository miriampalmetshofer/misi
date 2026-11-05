import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const returning = vi.fn().mockResolvedValue([{ id: "saved" }]);
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  const values = vi.fn().mockResolvedValue(undefined);
  return {
    values,
    returning,
    set,
    where,
    insert: vi.fn(() => ({ values })),
    update: vi.fn(() => ({ set })),
    delete: vi.fn(() => ({ where })),
  };
});
vi.mock("@/db", async () => ({
  schema: await vi.importActual("@/db/schema"),
  getDb: () => db,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { saveMeal, deleteMeal } from "./actions";

const id = "11111111-1111-1111-1111-111111111111";
const valid = {
  plannedOn: "2026-11-05",
  mealTime: "dinner",
  person: "both",
  name: "Curry",
};
function form(fields: Record<string, string>) {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.returning.mockResolvedValue([{ id }]);
});

describe("meal persistence", () => {
  it.each(["both", "miriam", "simon"])(
    "saves a meal for %s without creating a follow-up lunch",
    async (person) => {
      expect(
        await saveMeal(form({ ...valid, person, name: "  Curry  " })),
      ).toEqual({ error: null });
      expect(db.insert).toHaveBeenCalledTimes(1);
      expect(db.values).toHaveBeenCalledExactlyOnceWith({ ...valid, person });
    },
  );
  it.each<Record<string, string>>([
    { plannedOn: "2026-02-30" },
    { plannedOn: "0000-01-01" },
    { mealTime: "breakfast" },
    { person: "other" },
    { person: "toString" },
    { name: "  " },
    { name: "x".repeat(201) },
    { id: "bad" },
    { id, version: "" },
    { id, version: "0" },
    { id, version: "1.5" },
    { id, version: "2147483647" },
  ])("rejects invalid fields: %j", async (override) => {
    expect(
      (await saveMeal(form({ ...valid, ...override }))).error,
    ).toBeTruthy();
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
  it("updates only the selected entry and detects a concurrent deletion", async () => {
    expect(
      (await saveMeal(form({ ...valid, id, version: "1", person: "simon" })))
        .error,
    ).toBeNull();
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.where).toHaveBeenCalledTimes(1);
    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ ...valid, person: "simon" }),
    );
    db.returning.mockResolvedValueOnce([]);
    expect(
      (await saveMeal(form({ ...valid, id, version: "1" }))).error,
    ).toContain("inzwischen geändert oder gelöscht");
  });
  it("reports save failures without leaking database details and permits retry", async () => {
    db.values.mockRejectedValueOnce(
      new Error("private SQL and connection details"),
    );
    const result = await saveMeal(form(valid));
    expect(result.error).toContain("Speichern fehlgeschlagen");
    expect(result.error).not.toContain("private");
    expect((await saveMeal(form(valid))).error).toBeNull();
  });
  it("validates deletions and reports failure", async () => {
    expect((await deleteMeal("bad", 1)).error).toBeTruthy();
    expect(db.delete).not.toHaveBeenCalled();
    expect((await deleteMeal(id, 1)).error).toBeNull();
    db.delete.mockImplementationOnce(() => {
      throw new Error("offline");
    });
    expect((await deleteMeal(id, 1)).error).toContain("Löschen fehlgeschlagen");
  });
});

it.each([0, -1, 1.5, NaN, Infinity, 2147483647])(
  "rejects deleting with invalid version %s",
  async (version) => {
    expect((await deleteMeal(id, version)).error).toBeTruthy();
    expect(db.delete).not.toHaveBeenCalled();
  },
);

it("reports a delete conflict instead of success when no version matches", async () => {
  db.returning.mockResolvedValueOnce([]);
  expect((await deleteMeal(id, 1)).error).toContain(
    "inzwischen geändert oder gelöscht",
  );
});
