import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const returning = vi.fn().mockResolvedValue([{ id: "saved" }]);
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  const values = vi.fn().mockResolvedValue(undefined);
  return {
    values,
    insert: vi.fn(() => ({ values })),
    update: vi.fn(() => ({ set })),
    set,
    where,
    returning,
    delete: vi.fn(() => ({ where })),
  };
});
vi.mock("@/db", async () => ({
  schema: await vi.importActual("@/db/schema"),
  getDb: () => db,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { DrizzleQueryError } from "drizzle-orm/errors";
import { saveCarExpense, deleteCarExpense } from "./actions";

const id = "11111111-1111-1111-1111-111111111111";
const valid = {
  spentOn: "2026-10-24",
  description: "Winterreifen",
  totalAmount: "480,00",
  miriamPercent: "40",
  note: "Werkstatt",
};
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.returning.mockResolvedValue([{ id: "saved" }]);
});

describe("saveCarExpense", () => {
  it("derives amounts on the server and ignores forged amounts", async () => {
    expect(
      await saveCarExpense(
        form({ ...valid, miriamAmount: "0", simonAmount: "0" }),
      ),
    ).toEqual({ error: null });
    expect(db.values).toHaveBeenCalledWith({
      spentOn: valid.spentOn,
      description: valid.description,
      note: valid.note,
      totalAmount: 480,
      miriamPercent: 40,
      miriamAmount: 192,
      simonAmount: 288,
    });
  });

  it("updates an existing entry", async () => {
    await saveCarExpense(
      form({ ...valid, id, totalAmount: "0,05", miriamPercent: "50" }),
    );
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        totalAmount: 0.05,
        miriamAmount: 0.03,
        simonAmount: 0.02,
      }),
    );
  });

  it.each<Record<string, string>>([
    { spentOn: "2026-02-30" },
    { description: "  " },
    { description: "x".repeat(201) },
    { totalAmount: "0" },
    { totalAmount: "-2" },
    { totalAmount: "100001" },
    { totalAmount: "1,234" },
    { miriamPercent: "101" },
    { miriamPercent: "NaN" },
    { miriamPercent: "" },
    { miriamPercent: "33,333" },
    { note: "x".repeat(2001) },
    { id: "invalid" },
  ])("rejects invalid input %j", async (override) => {
    expect(
      (await saveCarExpense(form({ ...valid, ...override }))).error,
    ).toBeTruthy();
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("reports database failure and allows retrying", async () => {
    db.values.mockRejectedValueOnce(new Error("offline"));
    expect((await saveCarExpense(form(valid))).error).toContain(
      "Speichern fehlgeschlagen",
    );
    expect((await saveCarExpense(form(valid))).error).toBeNull();
  });

  it("logs SQLSTATE without SQL, household values or connection details", async () => {
    const cause = Object.assign(new Error("private database detail"), {
      code: "42P01",
    });
    db.values.mockRejectedValueOnce(
      new DrizzleQueryError(
        "insert into car_expense ...",
        ["Winterreifen", "private note"],
        cause,
      ),
    );

    await saveCarExpense(form(valid));

    expect(console.error).toHaveBeenCalledExactlyOnceWith("saveCarExpense", {
      type: "Error",
      code: "42P01",
    });
  });

  it("does not silently succeed when an edited entry disappeared", async () => {
    db.returning.mockResolvedValueOnce([]);
    expect((await saveCarExpense(form({ ...valid, id }))).error).toContain(
      "existiert nicht mehr",
    );
  });
});

describe("deleteCarExpense", () => {
  it("rejects malformed ids", async () => {
    expect((await deleteCarExpense("bad")).error).toBeTruthy();
    expect(db.delete).not.toHaveBeenCalled();
  });
  it("deletes an existing entry", async () => {
    expect((await deleteCarExpense(id)).error).toBeNull();
    expect(db.delete).toHaveBeenCalled();
  });

  it("reports delete failures without logging the exception message or arbitrary codes", async () => {
    db.delete.mockImplementationOnce(() => {
      throw Object.assign(
        new TypeError("https://user:password@database/private"),
        { code: "private connection detail" },
      );
    });

    expect((await deleteCarExpense(id)).error).toContain(
      "Löschen fehlgeschlagen",
    );
    expect(console.error).toHaveBeenCalledExactlyOnceWith("deleteCarExpense", {
      type: "TypeError",
    });
  });
});
