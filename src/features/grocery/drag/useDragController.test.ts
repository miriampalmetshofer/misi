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
    // Sections sit at fixed positions in the *document*; what
    // getBoundingClientRect reports shifts as the page scrolls, exactly as a
    // real one does. Without that, a stale viewport-relative cache would look
    // identical to a correct document-relative one.
    const documentTop = index * 100;
    section.getBoundingClientRect = () =>
      ({
        top: documentTop - window.scrollY,
        bottom: documentTop + 100 - window.scrollY,
      }) as DOMRect;
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

/** Pretend the page is scrolled down by `y`, as a real list would be. */
function scrollPageTo(y: number) {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
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


  it("resolves the drop target against the page scroll, not the viewport", () => {
    setUpSections();
    // Once there are more categories than fit on a phone, drags start on an
    // already-scrolled page. Sections sit at document 0..100 ("obst") and
    // 100..200 ("gebaeck"); scrolled by 120, "gebaeck" fills the viewport.
    scrollPageTo(120);
    const row = makeRow();
    const onMove = vi.fn();
    const { result } = renderHook(() => useDragController(onMove));

    act(() =>
      result.current.start({
        itemId: "brot",
        sourceCategoryId: "obst",
        element: row,
        pointerId: 1,
        originX: 0,
        originY: 10,
      }),
    );

    // Viewport 40 => document 160 => "gebaeck". Rects cached in viewport space
    // would read as obst -120..-20 and gebaeck -20..80, putting document 160
    // past the end of the list, and the drop would be discarded entirely.
    act(() => result.current.drop(40));

    expect(onMove).toHaveBeenCalledWith("brot", "gebaeck");
    scrollPageTo(0);
  });

  it("keeps the row under the finger when the page scrolls", () => {
    setUpSections();
    scrollPageTo(0);
    const row = makeRow();
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });

    const { result } = renderHook(() => useDragController(vi.fn()));
    act(() => result.current.start(startedSession(row)));

    // Finger held still, but the page scrolled 60px under it: the row has to
    // travel with the document to stay put on screen.
    scrollPageTo(60);
    act(() => result.current.move(0, 50));
    act(() => frames.forEach((frame) => frame(0)));

    expect(row.style.transform).toBe("translate3d(0px, 60px, 0)");

    scrollPageTo(0);
    vi.unstubAllGlobals();
  });


  it("scrolls the page when the finger reaches the bottom edge", () => {
    setUpSections();
    scrollPageTo(0);
    const row = makeRow();
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    const scrollBy = vi.fn((_x: number, y: number) => {
      scrollPageTo(window.scrollY + y);
    });
    vi.stubGlobal("scrollBy", scrollBy);
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });

    const { result } = renderHook(() => useDragController(vi.fn()));
    act(() => result.current.start(startedSession(row)));

    // Finger parked 10px from the bottom: a category below the fold has to be
    // reachable without letting go.
    act(() => result.current.move(0, 790));
    act(() => frames.forEach((frame) => frame(0)));

    expect(scrollBy).toHaveBeenCalled();
    expect(scrollBy.mock.calls[0][1]).toBeGreaterThan(0);

    act(() => result.current.cancel());
    scrollPageTo(0);
    vi.unstubAllGlobals();
  });

  it("does not scroll while the finger stays away from the edges", () => {
    setUpSections();
    scrollPageTo(0);
    const row = makeRow();
    const scrollBy = vi.fn();
    vi.stubGlobal("scrollBy", scrollBy);
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });

    const { result } = renderHook(() => useDragController(vi.fn()));
    act(() => result.current.start(startedSession(row)));
    act(() => result.current.move(0, 400));

    expect(scrollBy).not.toHaveBeenCalled();

    act(() => result.current.cancel());
    vi.unstubAllGlobals();
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
