"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";

import { useDrag } from "./DragContext";

// 400ms is roughly the native long-press feel; the previous 550ms read as the
// list ignoring you.
const HOLD_MS = 400;
// A finger resting on a phone drifts. Movement inside this radius is still a
// hold, not a scroll: at the previous 8px, ~17px of ordinary drift meant the
// drag never started at all.
const SLOP_PX = 10;

type PendingPress = {
  pointerId: number;
  sourceCategoryId: string;
  startX: number;
  startY: number;
  timer: ReturnType<typeof setTimeout>;
  dragging: boolean;
};

type DraggableItemOptions = {
  canDrag: boolean;
  itemId: string;
  sourceCategoryId: string;
};

export function useDraggableItem({
  canDrag,
  itemId,
  sourceCategoryId,
}: DraggableItemOptions) {
  const { draggedItemId, start, move, drop, cancel } = useDrag();
  const pressRef = useRef<PendingPress | null>(null);
  // Only ever read inside the click handler that follows a drop, so it is a ref
  // rather than state: nothing about the row renders differently for it.
  const suppressClickRef = useRef(false);
  const isDragging = draggedItemId === itemId;
  // Everything that is not the lifted row recedes, so it reads as the thing in
  // hand.
  const isDimmed = draggedItemId !== null && !isDragging;
  const canStartDrag = canDrag && draggedItemId === null;

  const clearPress = useCallback(() => {
    if (pressRef.current) {
      clearTimeout(pressRef.current.timer);
      pressRef.current = null;
    }
  }, []);

  useEffect(() => clearPress, [clearPress]);

  // While a row is lifted the page must not scroll under it; the drag scrolls
  // it deliberately at the edges instead. Selection is suppressed on the row
  // itself in CSS, because iOS starts selecting during the hold, before a drag
  // exists for this effect to react to.
  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const blockScroll = (event: TouchEvent) => event.preventDefault();

    document.addEventListener("touchmove", blockScroll, { passive: false });
    // A selection made just before the press is still on screen with its
    // handles; drop it so the lifted row is not dragged through it.
    document.getSelection()?.removeAllRanges();

    return () => document.removeEventListener("touchmove", blockScroll);
  }, [isDragging]);

  function handlePointerDown(event: PointerEvent<HTMLLIElement>) {
    // A drop does not always produce a click to swallow — ending the gesture
    // over something unclickable produces none at all — so re-arm here rather
    // than trusting the click to arrive and clear the flag.
    suppressClickRef.current = false;

    if (!canStartDrag || event.button !== 0) {
      return;
    }

    const element = event.currentTarget;
    const { pointerId, clientX, clientY } = event;

    const timer = setTimeout(() => {
      const press = pressRef.current;

      if (!press) {
        return;
      }

      press.dragging = true;

      // Capture keeps the gesture on this row even when the finger leaves it.
      // It throws if the pointer is already gone (a fast tap, or the row
      // re-rendered underneath us) — the drag is still valid without it.
      try {
        element.setPointerCapture(pointerId);
      } catch {
        // ignore: no active pointer to capture
      }

      suppressClickRef.current = true;
      navigator.vibrate?.(10);

      start({
        itemId,
        sourceCategoryId: press.sourceCategoryId,
        element,
        pointerId,
        originX: press.startX,
        originY: press.startY,
      });
    }, HOLD_MS);

    pressRef.current = {
      pointerId,
      sourceCategoryId,
      startX: clientX,
      startY: clientY,
      timer,
      dragging: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLLIElement>) {
    const press = pressRef.current;

    if (!press || press.pointerId !== event.pointerId) {
      return;
    }

    if (press.dragging) {
      move(event.clientX, event.clientY);
      return;
    }

    const dx = event.clientX - press.startX;
    const dy = event.clientY - press.startY;

    if (Math.hypot(dx, dy) <= SLOP_PX) {
      return;
    }

    // Past the slop radius and the hold has not fired yet. Vertical movement is
    // the page scrolling, so give the gesture up. Horizontal movement is not —
    // the list only scrolls vertically — so let the hold keep running.
    if (Math.abs(dy) > Math.abs(dx)) {
      clearPress();
      return;
    }

    // The hold survives, so this drift is part of it. Follow the finger with
    // the origin: start() records it as the drag origin, and leaving it at the
    // original touch point would snap the row sideways by the drift the moment
    // it lifts.
    press.startX = event.clientX;
    press.startY = event.clientY;
  }

  function handlePointerUp(event: PointerEvent<HTMLLIElement>) {
    const press = pressRef.current;

    // A second finger lifting must not end the first finger's drag: its
    // clientY would drop the item wherever that finger happened to be.
    if (!press || press.pointerId !== event.pointerId) {
      return;
    }

    clearPress();

    if (!press.dragging) {
      return;
    }

    drop(event.clientY);
  }

  function handlePointerCancel(event: PointerEvent<HTMLLIElement>) {
    const press = pressRef.current;

    // iOS cancels unrelated touches routinely when it takes a gesture over;
    // only this pointer's own cancellation should abort the drag.
    if (!press || press.pointerId !== event.pointerId) {
      return;
    }

    clearPress();

    if (!press.dragging) {
      return;
    }

    cancel();
  }

  // A drag ends over some row's text; without this the drop would also open
  // that row's editor.
  function handleClickCapture(event: MouseEvent<HTMLLIElement>) {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }

  return {
    isDragging,
    isDimmed,
    dragProps: {
      onClickCapture: handleClickCapture,
      onPointerCancel: handlePointerCancel,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  };
}
