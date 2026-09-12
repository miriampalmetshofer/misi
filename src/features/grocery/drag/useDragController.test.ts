import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useDragController } from "./useDragController";

/**
 * happy-dom has no layout, so give the controller a document whose category
 * sections occupy real vertical bands.
 */
function setUpSections() {
  document.body.innerHTML = `
    <section data-category-id="obst"></section>
    <section data-category-id="gebaeck"></section>
  `;

  const sections = [...document.querySelectorAll("[data-category-id]")];
  sections.forEach((section, index) => {
    const top = index * 100;
    section.getBoundingClientRect = () =>
      ({ top, bottom: top + 100 }) as DOMRect;
  });
}

function makeRow() {
  const row = document.createElement("li");
  document.body.append(row);
  return row;
}

function startedSession(row: HTMLElement) {
  return {
    itemId: "brot",
    sourceCategoryId: "obst",
    element: row,
    pointerId: 1,
    originX: 0,
    originY: 50,
  };
}

describe("useDragController", () => {
  it("writes the finger offset straight onto the element", () => {
    setUpSections();
    const row = makeRow();
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });

    const { result } = renderHook(() => useDragController(vi.fn()));

    act(() => result.current.start(startedSession(row)));
    act(() => result.current.move(30, 90));
    act(() => frames.forEach((frame) => frame(0)));

    expect(row.style.transform).toBe("translate3d(30px, 40px, 0)");
    vi.unstubAllGlobals();
  });

  it("moves the item when dropped on a different category", () => {
    setUpSections();
    const row = makeRow();
    const onMove = vi.fn();
    const { result } = renderHook(() => useDragController(onMove));

    act(() => result.current.start(startedSession(row)));
    act(() => result.current.drop(150));

    expect(onMove).toHaveBeenCalledWith("brot", "gebaeck");
    // The row is handed back to the stylesheet once the drag ends.
    expect(row.style.transform).toBe("");
  });

  it("does not move the item when dropped on its own category", () => {
    setUpSections();
    const row = makeRow();
    const onMove = vi.fn();
    const { result } = renderHook(() => useDragController(onMove));

    act(() => result.current.start(startedSession(row)));
    act(() => result.current.drop(50));

    expect(onMove).not.toHaveBeenCalled();
  });

  it("abandons a drag when the tab is hidden mid-gesture", () => {
    setUpSections();
    const row = makeRow();
    const onMove = vi.fn();
    const { result } = renderHook(() => useDragController(onMove));

    act(() => result.current.start(startedSession(row)));
    expect(result.current.draggedItemId).toBe("brot");

    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.draggedItemId).toBeNull();
    expect(onMove).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
