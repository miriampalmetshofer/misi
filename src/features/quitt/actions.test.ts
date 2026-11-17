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

import { saveQuittEntry, deleteQuittEntry } from "./actions";

const id = "11111111-1111-1111-1111-111111111111";
const valid = {
  kind: "expense",
  description: "Einkauf",
  amount: "48,00",
  paidBy: "miriam",
  forWhom: "both",
  occurredOn: "2026-11-17",
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

describe("Quitt persistence", () => {
  it("stores exact cents and derives the payment recipient on the server", async () => {
    expect(
      (
        await saveQuittEntry(
          form({ ...valid, kind: "payment", forWhom: "both" }),
        )
      ).error,
    ).toBeNull();
    expect(db.values).toHaveBeenCalledWith({
      kind: "payment",
      description: "Einkauf",
      amountCents: 4800,
      paidBy: "miriam",
      forWhom: "simon",
      occurredOn: "2026-11-17",
    });
  });
  it.each<Record<string, string>>([
    { amount: "0" },
    { amount: "1.001" },
    { paidBy: "other" },
    { forWhom: "other" },
    { kind: "other" },
    { occurredOn: "2026-02-30" },
    { description: " " },
    { description: "x".repeat(201) },
    { id: "bad" },
    { id, version: "0" },
  ])("rejects invalid fields %j", async (override) => {
    expect(
      (await saveQuittEntry(form({ ...valid, ...override }))).error,
    ).toBeTruthy();
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
  it("detects stale edits and deletions", async () => {
    db.returning.mockResolvedValue([]);
    expect(
      (await saveQuittEntry(form({ ...valid, id, version: "1" }))).error,
    ).toContain("inzwischen geändert");
    expect((await deleteQuittEntry(id, 1)).error).toContain(
      "inzwischen geändert",
    );
    expect((await deleteQuittEntry("bad", 1)).error).toBeTruthy();
  });
  it("reports database failures without leaking details and permits retry", async () => {
    db.values.mockRejectedValueOnce(new Error("private connection details"));
    const result = await saveQuittEntry(form(valid));
    expect(result.error).toContain("Speichern fehlgeschlagen");
    expect(result.error).not.toContain("private");
    expect((await saveQuittEntry(form(valid))).error).toBeNull();
  });
});
