import { beforeEach, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

const db = vi.hoisted(() => {
  const returning = vi.fn();
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  return { update: vi.fn(() => ({ set })), set, where, returning };
});
vi.mock("@/db", async () => ({
  schema: await vi.importActual("@/db/schema"),
  getDb: () => db,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { schema } from "@/db";
import { revalidatePath } from "next/cache";
import { setPaymentSettled } from "./actions";

const id = "11111111-1111-1111-1111-111111111111";
beforeEach(() => {
  vi.clearAllMocks();
  db.returning.mockResolvedValue([{ id }]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

it.each(["fuel", "expense"] as const)(
  "sets and clears %s payment status without changing the amounts",
  async (kind) => {
    const table = kind === "fuel" ? schema.fuelFillUps : schema.carExpenses;
    for (const isSettled of [true, false]) {
      expect(await setPaymentSettled(kind, id, isSettled)).toEqual({
        error: null,
      });
      expect(db.update).toHaveBeenLastCalledWith(table);
      expect(db.set).toHaveBeenLastCalledWith({
        isSettled,
        updatedAt: expect.any(Date),
      });
      expect(db.where).toHaveBeenLastCalledWith(eq(table.id, id));
    }
    expect(revalidatePath).toHaveBeenCalledWith("/auto");
  },
);

it.each([
  ["fuel", "bad", true],
  ["other", id, true],
  ["expense", id, "false"],
  ["fuel", null, true],
])(
  "rejects malformed action arguments %j %j %j",
  async (kind, entryId, settled) => {
    // Server actions must validate callers beyond TypeScript.
    // @ts-expect-error deliberately invalid serialized input
    const result = await setPaymentSettled(kind, entryId, settled);
    expect(result.error).toBeTruthy();
    expect(db.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  },
);

it("reports a deleted entry instead of claiming payment was saved", async () => {
  db.returning.mockResolvedValueOnce([]);
  expect((await setPaymentSettled("fuel", id, true)).error).toContain(
    "existiert nicht mehr",
  );
  expect(revalidatePath).not.toHaveBeenCalled();
});

it("reports failures without leaking database parameters and permits retrying", async () => {
  db.returning.mockRejectedValueOnce(
    new Error("private SQL and connection details"),
  );
  expect((await setPaymentSettled("expense", id, true)).error).toContain(
    "nicht gespeichert",
  );
  expect(console.error).toHaveBeenCalledExactlyOnceWith(
    "setPaymentSettled: database update failed",
  );
  expect(revalidatePath).not.toHaveBeenCalled();
  expect((await setPaymentSettled("expense", id, true)).error).toBeNull();
});
