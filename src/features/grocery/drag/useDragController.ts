"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  findCategoryAtPoint,
  measureCategoryRects,
  type CategoryRect,
} from "./geometry";

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
  frame: number | null;
  pendingX: number;
  pendingY: number;
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

  const paint = useCallback(() => {
    const session = sessionRef.current;

    if (!session) {
      return;
    }

    session.frame = null;
    session.element.style.transform = `translate3d(${session.pendingX}px, ${session.pendingY}px, 0)`;
  }, []);

  const releaseSession = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;

    if (!session) {
      return null;
    }

    if (session.frame !== null) {
      cancelAnimationFrame(session.frame);
    }

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

  const start = useCallback(
    (session: DragSession) => {
      const rects = measureCategoryRects(document);

      sessionRef.current = {
        ...session,
        rects,
        frame: null,
        pendingX: 0,
        pendingY: 0,
      };

      session.element.style.willChange = "transform";
      setDraggedItemId(session.itemId);
      setDropCategoryId(
        findCategoryAtPoint(rects, session.originY) ?? session.sourceCategoryId,
      );
    },
    [],
  );

  const move = useCallback(
    (clientX: number, clientY: number) => {
      const session = sessionRef.current;

      if (!session) {
        return;
      }

      session.pendingX = clientX - session.originX;
      session.pendingY = clientY - session.originY;

      if (session.frame === null) {
        session.frame = requestAnimationFrame(paint);
      }

      const next = findCategoryAtPoint(session.rects, clientY);
      setDropCategoryId((current) => (current === next ? current : next));
    },
    [paint],
  );

  const drop = useCallback(
    (clientY: number) => {
      const session = sessionRef.current;

      if (!session) {
        return;
      }

      const target = findCategoryAtPoint(session.rects, clientY);

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
