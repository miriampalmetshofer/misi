"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const UNDO_WINDOW_MS = 5000;

type Offer<Payload> = {
  id: string;
  label: string;
  payload: Payload;
};

/**
 * Keep the most recent undoable action around for `UNDO_WINDOW_MS`.
 *
 * This is display state only: the write it belongs to has already been sent, and
 * taking it back is a new write of its own. So an expired window loses nothing —
 * it just stops offering the button.
 *
 * One offer at a time. Stacking bars would cover the list, and a shopping list
 * never needs more than "that last tap was wrong".
 */
export function useUndo<Payload>() {
  const [offer, setOffer] = useState<Offer<Payload> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clear = useCallback(() => {
    clearTimeout(timer.current);
    setOffer(null);
  }, []);

  const push = useCallback((label: string, payload: Payload) => {
    clearTimeout(timer.current);
    setOffer({ id: crypto.randomUUID(), label, payload });
    timer.current = setTimeout(() => setOffer(null), UNDO_WINDOW_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { offer, push, clear };
}
