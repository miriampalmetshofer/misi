import { describe, expect, it } from "vitest";
import { isMealDate, shiftDate, weekStart } from "./types";

describe("calendar weeks", () => {
  it("uses Monday across month and year boundaries", () => {
    expect(weekStart("2027-01-03")).toBe("2026-12-28");
    expect(weekStart("2027-01-04")).toBe("2027-01-04");
    expect(shiftDate("2026-12-28", 7)).toBe("2027-01-04");
  });
  it("advances calendar days across daylight saving changes", () => {
    expect(shiftDate("2026-03-23", 7)).toBe("2026-03-30");
    expect(shiftDate("2026-10-19", 7)).toBe("2026-10-26");
  });
  it("checks leap years and exact date formatting", () => {
    expect(isMealDate("2028-02-29")).toBe(true);
    expect(isMealDate("2026-02-29")).toBe(false);
    expect(isMealDate("2026-2-01")).toBe(false);
  });
});
