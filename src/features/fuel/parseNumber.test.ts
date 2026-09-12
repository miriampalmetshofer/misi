import { describe, expect, it } from "vitest";

import { parseNumber } from "./parseNumber";

describe("parseNumber", () => {
  it("reads the comma as the decimal separator", () => {
    expect(parseNumber("256,4")).toBe(256.4);
    expect(parseNumber("102,50")).toBe(102.5);
    expect(parseNumber("1234")).toBe(1234);
  });

  it("returns null for input it cannot read", () => {
    // The form turns a typed dot into a comma, so a dot arriving here is junk.
    expect(parseNumber("256.4")).toBeNull();
    expect(parseNumber("1.256,4")).toBeNull();
    expect(parseNumber("12,34,56")).toBeNull();
    expect(parseNumber("1 000")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("12a")).toBeNull();
    expect(parseNumber("-5")).toBeNull();
  });

  it("does not cap the number of decimals", () => {
    // There is no grouping separator, so "1,234" is a number with three
    // decimals. It is accepted rather than flagged, which does mean a "1.234"
    // typed as 1234 km reads as 1,234 km instead of being rejected.
    expect(parseNumber("1,234")).toBe(1.234);
    expect(parseNumber("0,12345")).toBe(0.12345);
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
