import { describe, expect, it } from "vitest";

import { parseNumber } from "./parseNumber";

describe("parseNumber", () => {
  it("reads both decimal separators", () => {
    expect(parseNumber("256,4")).toBe(256.4);
    expect(parseNumber("256.4")).toBe(256.4);
    expect(parseNumber("1234")).toBe(1234);
  });

  it("has no thousands separator, so a dot is always a decimal point", () => {
    // The old implementation read "1.234" as 1.234 by accident. It now does so
    // by decision: with no grouping separator the input is unambiguous, and a
    // mistyped odometer reading cannot silently become a 1000x error.
    expect(parseNumber("1.234")).toBe(1.234);
    expect(parseNumber("1,234")).toBe(1.234);
  });

  it("returns null for input it cannot read", () => {
    expect(parseNumber("1.256,4")).toBeNull();
    expect(parseNumber("12,34,56")).toBeNull();
    expect(parseNumber("1 000")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("12a")).toBeNull();
    expect(parseNumber("-5")).toBeNull();
  });

  it("treats an empty field as not filled in", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("   ")).toBeNull();
  });

  it("reads a half-typed decimal as a partial entry", () => {
    expect(parseNumber("256,")).toBe(256);
    expect(parseNumber(",5")).toBe(0.5);
  });
});
