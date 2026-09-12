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
 */
export function measureCategoryRects(root: ParentNode): CategoryRect[] {
  return [...root.querySelectorAll<HTMLElement>("[data-category-id]")]
    .map((section) => {
      const { top, bottom } = section.getBoundingClientRect();
      return { categoryId: section.dataset.categoryId ?? "", top, bottom };
    })
    .filter((rect) => rect.categoryId !== "")
    .sort((a, b) => a.top - b.top);
}

/**
 * Resolve the category under a point. Sections are separated by margins, so a
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

  const direct = rects.find(
    (rect) => clientY >= rect.top && clientY <= rect.bottom,
  );

  if (direct) {
    return direct.categoryId;
  }

  // In a gap: attach to whichever neighbouring section is closer.
  let nearest = first;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const rect of rects) {
    const distance =
      clientY < rect.top ? rect.top - clientY : clientY - rect.bottom;

    if (distance < nearestDistance) {
      nearest = rect;
      nearestDistance = distance;
    }
  }

  return nearest.categoryId;
}
