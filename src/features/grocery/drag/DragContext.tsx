"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import { useDragController, type DragController } from "./useDragController";

const DragContext = createContext<DragController | null>(null);

type DragProviderProps = {
  children: ReactNode;
  onMoveItem: (itemId: string, categoryId: string) => void;
};

/**
 * Drag state used to be threaded as eleven props through the view and every
 * category section, which only forwarded them. The rows that actually drag read
 * it from here instead.
 */
export function DragProvider({ children, onMoveItem }: DragProviderProps) {
  const controller = useDragController(onMoveItem);

  return (
    <DragContext.Provider value={controller}>{children}</DragContext.Provider>
  );
}

export function useDrag() {
  const controller = useContext(DragContext);

  if (!controller) {
    throw new Error("useDrag must be used inside a DragProvider");
  }

  return controller;
}
