import { describe, expect, it } from "vitest";

import { findCategoryAtPoint, type CategoryRect } from "./geometry";

function rects(): CategoryRect[] {
  return [
    { categoryId: "obst", top: 0, bottom: 100 },
    // a 20px gap, as the sections have vertical margins between them
    { categoryId: "gebaeck", top: 120, bottom: 220 },
    { categoryId: "haushalt", top: 240, bottom: 340 },
  ];
}

describe("findCategoryAtPoint", () => {
  it("resolves a point inside a section", () => {
    expect(findCategoryAtPoint(rects(), 50)).toBe("obst");
    expect(findCategoryAtPoint(rects(), 200)).toBe("gebaeck");
  });

  it("includes the section edges", () => {
    expect(findCategoryAtPoint(rects(), 0)).toBe("obst");
    expect(findCategoryAtPoint(rects(), 100)).toBe("obst");
  });

  it("snaps a point in the gap to the nearer section", () => {
    expect(findCategoryAtPoint(rects(), 105)).toBe("obst");
    expect(findCategoryAtPoint(rects(), 118)).toBe("gebaeck");
  });

  // Exactly halfway across the gap: pick the section below, so a finger moving
  // down the list changes target only once it is past the midpoint.
  it("resolves a tie in the gap to the lower section", () => {
    expect(findCategoryAtPoint(rects(), 110)).toBe("gebaeck");
  });

  it("returns null outside the list entirely", () => {
    expect(findCategoryAtPoint(rects(), -40)).toBeNull();
    expect(findCategoryAtPoint(rects(), 900)).toBeNull();
  });

  it("returns null when there is nothing to hit", () => {
    expect(findCategoryAtPoint([], 50)).toBeNull();
  });
});
