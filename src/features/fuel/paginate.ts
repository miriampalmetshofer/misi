/** Fill-ups per page in the history. */
export const PAGE_SIZE = 10;

/**
 * The page numbers to show, with `null` standing for a gap.
 *
 * Always includes the first and last page plus the ones neighbouring the
 * current page, so the control keeps a stable width instead of growing with
 * the history. With few enough pages to show them all, no gap is produced.
 */
export function pageItems(page: number, pageCount: number): (number | null)[] {
  // First, last, current, and one either side: seven slots at most once the
  // two gaps are counted, so anything smaller lists every page.
  if (pageCount <= 7) {
    return range(1, pageCount);
  }

  // Near either end the window would run past the edge and come back short,
  // making the control narrower there than in the middle. Sliding it back
  // inside keeps the same three pages between the gaps wherever you are.
  const windowStart = Math.min(Math.max(2, page - 1), pageCount - 3);
  const middle = range(windowStart, windowStart + 2);
  const items: (number | null)[] = [1];

  // A gap that would hide a single page is wider than the page it replaces.
  if (middle[0] > 2) {
    items.push(middle[0] === 3 ? 2 : null);
  }

  items.push(...middle);

  const lastMiddle = middle[middle.length - 1];
  if (lastMiddle < pageCount - 1) {
    items.push(lastMiddle === pageCount - 2 ? pageCount - 1 : null);
  }

  items.push(pageCount);

  return items;
}

/** Total pages for `total` entries, at least one so an empty list has a page. */
export function pageCountFor(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/**
 * Keeps a page number inside the list.
 *
 * The history shrinks when a fill-up is deleted, so the page being viewed can
 * fall off the end; clamping moves back to the last page that still exists.
 */
export function clampPage(page: number, pageCount: number) {
  return Math.min(Math.max(1, page), pageCount);
}

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}
