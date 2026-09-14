"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  findCategoryAtPoint,
  measureCategoryRects,
  type CategoryRect,
} from "./geometry";

// How close to the top or bottom edge the finger has to get before the page
// starts scrolling itself, and how fast it does so at the very edge.
const EDGE_ZONE_PX = 72;
const MAX_EDGE_SPEED_PX_PER_FRAME = 14;

export type DragSession = {
  itemId: string;
  sourceCategoryId: string;
  element: HTMLElement;
  pointerId: number;
  originX: number;
  originY: number;
};

type ActiveSession = DragSession & {
  rects: CategoryRect[];
  /** Page scroll when the drag started, to keep the row under the finger. */
  originScrollY: number;
  /**
   * Furthest the page may scroll during this drag: enough to bring the last
   * category fully into view, and no further. The dragged row is translated
   * out of its slot and lengthens the document as it goes, so the browser's own
   * scroll limit keeps receding and cannot be used as the stop.
   */
  maxScrollY: number;
  frame: number | null;
  pendingX: number;
  pendingY: number;
  edgeSpeed: number;
};

export type DragController = ReturnType<typeof useDragController>;

/**
 * Owns a drag from pickup to drop.
 *
 * The dragged row is moved by writing a transform straight onto its element
 * inside a requestAnimationFrame, so the finger never waits for React. React is
 * told only about things that change how the tree renders: which item is being
 * dragged, and which category is currently under it. That is a handful of
 * renders per drag instead of one per pointer move.
 */
export function useDragController(
  onMoveItem: (itemId: string, categoryId: string) => void,
) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropCategoryId, setDropCategoryId] = useState<string | null>(null);
  const sessionRef = useRef<ActiveSession | null>(null);

  /** Re-resolve the drop target for the finger's current document position. */
  const refreshTarget = useCallback((session: ActiveSession) => {
    // pendingY is a screen-space delta, so the finger's document position is
    // its current viewport Y plus however far the page is scrolled.
    const documentY = session.originY + session.pendingY + window.scrollY;
    const next = findCategoryAtPoint(session.rects, documentY);
    setDropCategoryId((current) => (current === next ? current : next));
  }, []);

  /**
   * One frame of the drag: scroll if the finger is resting near an edge, then
   * put the row back under it. The frame keeps running only while the edge
   * scroll still has somewhere to go — a finger held still in the middle of the
   * screen paints once and stops.
   */
  const scheduleFrame = useCallback(
    (session: ActiveSession) => {
      if (session.frame !== null) {
        return;
      }

      const runFrame = () => {
        session.frame = null;

        if (session.edgeSpeed !== 0) {
          const before = window.scrollY;
          const next = Math.min(
            Math.max(0, before + session.edgeSpeed),
            session.maxScrollY,
          );

          if (next === before) {
            // Already at the end of the list: nothing left to reveal.
            session.edgeSpeed = 0;
          } else {
            window.scrollTo(0, next);
            refreshTarget(session);
          }
        }

        // The row is positioned in the document, so a page that scrolled under
        // it has to be added back in for it to stay under the finger.
        const scrolled = window.scrollY - session.originScrollY;
        session.element.style.transform = `translate3d(${session.pendingX}px, ${session.pendingY + scrolled}px, 0)`;

        // Keep the loop alive only while the edge scroll still has somewhere to
        // go; a finger held still in the middle of the screen paints once.
        if (session.edgeSpeed !== 0) {
          session.frame = requestAnimationFrame(runFrame);
        }
      };

      session.frame = requestAnimationFrame(runFrame);
    },
    [refreshTarget],
  );

  /**
   * How fast the page should scroll itself, so a category below the fold can be
   * reached without letting go. Ramps up as the finger nears the edge.
   */
  const updateEdgeSpeed = useCallback((session: ActiveSession, clientY: number) => {
    const fromTop = clientY;
    const fromBottom = window.innerHeight - clientY;

    if (fromTop < EDGE_ZONE_PX) {
      session.edgeSpeed =
        -MAX_EDGE_SPEED_PX_PER_FRAME * (1 - fromTop / EDGE_ZONE_PX);
    } else if (fromBottom < EDGE_ZONE_PX) {
      session.edgeSpeed =
        MAX_EDGE_SPEED_PX_PER_FRAME * (1 - fromBottom / EDGE_ZONE_PX);
    } else {
      session.edgeSpeed = 0;
    }
  }, []);

  const releaseSession = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;

    if (!session) {
      return null;
    }

    // One loop drives both the scrolling and the painting, so cancelling the
    // pending frame and zeroing the speed is the whole teardown.
    if (session.frame !== null) {
      cancelAnimationFrame(session.frame);
    }

    session.edgeSpeed = 0;

    // Hand the row back to the stylesheet; React re-renders it unlifted.
    session.element.style.transform = "";
    session.element.style.willChange = "";

    // Releasing a capture the browser has already dropped (pointercancel, the
    // element being re-rendered) throws NotFoundError. The capture is gone
    // either way, so failing here is not interesting.
    try {
      if (session.element.hasPointerCapture?.(session.pointerId)) {
        session.element.releasePointerCapture(session.pointerId);
      }
    } catch {
      // ignore: capture already released by the browser
    }

    setDraggedItemId(null);
    setDropCategoryId(null);

    return session;
  }, []);

  const start = useCallback((session: DragSession) => {
    const scrollY = window.scrollY;
    const rects = measureCategoryRects(document, scrollY);
    const listBottom = rects.at(-1)?.bottom ?? scrollY;

    sessionRef.current = {
      ...session,
      rects,
      originScrollY: scrollY,
      maxScrollY: Math.max(0, listBottom - window.innerHeight + EDGE_ZONE_PX),
      frame: null,
      pendingX: 0,
      pendingY: 0,
      edgeSpeed: 0,
    };

    session.element.style.willChange = "transform";
    setDraggedItemId(session.itemId);
    setDropCategoryId(
      findCategoryAtPoint(rects, session.originY + scrollY) ??
        session.sourceCategoryId,
    );
  }, []);

  const move = useCallback(
    (clientX: number, clientY: number) => {
      const session = sessionRef.current;

      if (!session) {
        return;
      }

      session.pendingX = clientX - session.originX;
      // How far the finger has travelled across the screen. The page scroll is
      // added separately at paint time, because the row moves with the document
      // and has to be pushed back to wherever the finger now is.
      session.pendingY = clientY - session.originY;

      refreshTarget(session);
      updateEdgeSpeed(session, clientY);
      scheduleFrame(session);
    },
    [refreshTarget, scheduleFrame, updateEdgeSpeed],
  );

  const drop = useCallback(
    (clientY: number) => {
      const session = sessionRef.current;

      if (!session) {
        return;
      }

      const target = findCategoryAtPoint(session.rects, clientY + window.scrollY);

      releaseSession();

      if (target && target !== session.sourceCategoryId) {
        onMoveItem(session.itemId, target);
      }
    },
    [onMoveItem, releaseSession],
  );

  const cancel = useCallback(() => {
    releaseSession();
  }, [releaseSession]);

  // A drag in flight when the tree unmounts would otherwise leak its frame.
  useEffect(() => () => void releaseSession(), [releaseSession]);

  // A backgrounded tab stops servicing requestAnimationFrame, so a drag left
  // running there would freeze mid-gesture and resume somewhere unexpected.
  // Drop it instead; the item stays where it was.
  useEffect(() => {
    const abandonWhenHidden = () => {
      if (document.hidden) {
        releaseSession();
      }
    };

    document.addEventListener("visibilitychange", abandonWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", abandonWhenHidden);
  }, [releaseSession]);

  return { draggedItemId, dropCategoryId, start, move, drop, cancel };
}
