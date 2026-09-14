import { describe, expect, it } from "vitest";

import { monthsBefore } from "./dateRange";

describe("monthsBefore", () => {
  it("keeps the day of the month when the target month is long enough", () => {
    expect(monthsBefore("2026-09-14", 3)).toBe("2026-06-14");
  });

  it("crosses the turn of the year", () => {
    expect(monthsBefore("2026-02-10", 3)).toBe("2025-11-10");
  });

  it("clamps to the last day when the target month is shorter", () => {
    // Not 2026-03-03, which is where a plain setMonth would overflow to.
    expect(monthsBefore("2026-05-31", 3)).toBe("2026-02-28");
  });

  it("lands on 29 February in a leap year", () => {
    expect(monthsBefore("2024-05-31", 3)).toBe("2024-02-29");
  });

  it("passes an unparseable date through untouched", () => {
    expect(monthsBefore("", 3)).toBe("");
  });
});
