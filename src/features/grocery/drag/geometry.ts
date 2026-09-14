/**
 * Drop targeting is pure arithmetic against rectangles measured once, when the
 * drag starts. The previous implementation asked the live DOM on every pointer
 * move (elementFromPoint, plus toggling the dragged row's pointerEvents so it
 * would not hit itself), which interleaved layout reads and writes every frame.
 */

export type CategoryRect = {
  categoryId: string;
  top: number;
  bottom: number;
};

/**
 * Measure every category section into a list of vertical bands, in document
 * order. Only the vertical axis is kept: the sections span the full list width,
 * so horizontal position never decides the target, and ignoring it means a
 * sideways drag still drops where the finger is vertically.
 *
 * Bands are stored in document coordinates, not viewport ones. The page scrolls
 * during a drag — by hand, and by the edge auto-scroll — and viewport-relative
 * bounds measured at pickup would point at the wrong category the moment it did.
 */
export function measureCategoryRects(
  root: ParentNode,
  scrollY: number,
): CategoryRect[] {
  return [...root.querySelectorAll<HTMLElement>("[data-category-id]")]
    .map((section) => {
      const { top, bottom } = section.getBoundingClientRect();
      return {
        categoryId: section.dataset.categoryId ?? "",
        top: top + scrollY,
        bottom: bottom + scrollY,
      };
    })
    .filter((rect) => rect.categoryId !== "")
    .sort((a, b) => a.top - b.top);
}

/**
 * Resolve the category under a document-space Y. Sections are separated by margins, so a
 * finger in the gap between two of them matches neither band; rather than
 * dropping the gesture, snap to the nearest edge. Anything above the first or
 * below the last section stays unresolved, so a drop there is a no-op.
 */
export function findCategoryAtPoint(
  rects: CategoryRect[],
  clientY: number,
): string | null {
  if (rects.length === 0) {
    return null;
  }

  const first = rects[0];
  const last = rects[rects.length - 1];

  if (clientY < first.top || clientY > last.bottom) {
    return null;
  }

  // Sections are in document order, so the first one reaching past the point
  // either contains it or is the section just below the gap it sits in.
  const index = rects.findIndex((rect) => clientY <= rect.bottom);
  const below = rects[index];

  if (clientY >= below.top) {
    return below.categoryId;
  }

  // In the gap above it: attach to whichever of the two neighbours is closer.
  const above = rects[index - 1];
  const closerToAbove = clientY - above.bottom < below.top - clientY;

  return closerToAbove ? above.categoryId : below.categoryId;
}
