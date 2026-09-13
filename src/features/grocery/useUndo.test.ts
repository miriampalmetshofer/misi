import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { UNDO_WINDOW_MS, useUndo } from "./useUndo";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useUndo", () => {
  it("offers nothing until something is pushed", () => {
    const { result } = renderHook(() => useUndo<string>());

    expect(result.current.offer).toBeNull();
  });

  it("keeps the label and payload it was given", () => {
    const { result } = renderHook(() => useUndo<string>());

    act(() => result.current.push("Äpfel erledigt", "apfel"));

    expect(result.current.offer?.label).toBe("Äpfel erledigt");
    expect(result.current.offer?.payload).toBe("apfel");
  });

  it("withdraws the offer once the window has passed", () => {
    const { result } = renderHook(() => useUndo<string>());

    act(() => result.current.push("Äpfel erledigt", "apfel"));
    act(() => vi.advanceTimersByTime(UNDO_WINDOW_MS));

    expect(result.current.offer).toBeNull();
  });

  it("still offers the undo just before the window closes", () => {
    const { result } = renderHook(() => useUndo<string>());

    act(() => result.current.push("Äpfel erledigt", "apfel"));
    act(() => vi.advanceTimersByTime(UNDO_WINDOW_MS - 1));

    expect(result.current.offer).not.toBeNull();
  });

  it("drops the offer when it is cleared", () => {
    const { result } = renderHook(() => useUndo<string>());

    act(() => result.current.push("Äpfel erledigt", "apfel"));
    act(() => result.current.clear());

    expect(result.current.offer).toBeNull();
  });

  it("replaces an offer rather than stacking, and restarts the window", () => {
    const { result } = renderHook(() => useUndo<string>());

    act(() => result.current.push("Äpfel erledigt", "apfel"));
    act(() => vi.advanceTimersByTime(UNDO_WINDOW_MS - 1000));
    act(() => result.current.push("Bananen erledigt", "bananen"));

    // The first offer's timer must not expire the second one early.
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.offer?.payload).toBe("bananen");

    act(() => vi.advanceTimersByTime(UNDO_WINDOW_MS));
    expect(result.current.offer).toBeNull();
  });

  it("gives each offer its own id so the bar can re-animate", () => {
    const { result } = renderHook(() => useUndo<string>());

    act(() => result.current.push("Äpfel erledigt", "apfel"));
    const first = result.current.offer?.id;

    act(() => result.current.push("Äpfel erledigt", "apfel"));

    expect(result.current.offer?.id).not.toBe(first);
  });
});
