import { describe, expect, it } from "vitest";

import { PAGE_SIZE, clampPage, pageCountFor, pageItems } from "./paginate";

describe("pageCountFor", () => {
  it("keeps one page for an empty history", () => {
    expect(pageCountFor(0)).toBe(1);
  });

  it("adds a page for a partly filled one", () => {
    expect(pageCountFor(PAGE_SIZE)).toBe(1);
    expect(pageCountFor(PAGE_SIZE + 1)).toBe(2);
  });
});

describe("clampPage", () => {
  it("pulls a page past the end back to the last one", () => {
    expect(clampPage(5, 3)).toBe(3);
  });

  it("never goes below the first page", () => {
    expect(clampPage(0, 3)).toBe(1);
  });
});

describe("pageItems", () => {
  it("lists every page while they still fit", () => {
    expect(pageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps first, last and the current page's neighbours", () => {
    expect(pageItems(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
  });

  it("slides the window inward at the ends instead of shrinking", () => {
    expect(pageItems(1, 10)).toEqual([1, 2, 3, 4, null, 10]);
    expect(pageItems(10, 10)).toEqual([1, null, 7, 8, 9, 10]);
  });

  it("spells out a page rather than hiding it behind a gap", () => {
    // A gap standing in for page 2 alone would take more room than the page.
    expect(pageItems(4, 10)).toEqual([1, 2, 3, 4, 5, null, 10]);
  });

  it("keeps a stable width as the current page moves", () => {
    const widths = [1, 3, 5, 7, 9, 12].map(
      (page) => pageItems(page, 12).length,
    );

    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
  });
});
