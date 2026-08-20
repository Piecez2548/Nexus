import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRequestPermissions = vi.fn();
const mockWatchPosition = vi.fn();
const mockClearWatch = vi.fn();

vi.mock("@capacitor/geolocation", () => ({
  Geolocation: {
    requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
    watchPosition: (...args: unknown[]) => mockWatchPosition(...args),
    clearWatch: (...args: unknown[]) => mockClearWatch(...args),
  },
}));

import { useGpsTracker } from "./useGpsTracker";

function fakePosition(lat: number, lng: number, accuracy = 10) {
  return { coords: { latitude: lat, longitude: lng, accuracy }, timestamp: Date.now() };
}

describe("useGpsTracker", () => {
  let positionCallback: (position: unknown, err?: unknown) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T00:00:00.000Z"));
    mockRequestPermissions.mockResolvedValue({ location: "granted" });
    mockWatchPosition.mockImplementation((_options: unknown, callback: (position: unknown, err?: unknown) => void) => {
      positionCallback = callback;
      return Promise.resolve("watch-1");
    });
    mockClearWatch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("starts tracking and appends a route point on each position update", async () => {
    const { result } = renderHook(() => useGpsTracker());

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state.status).toBe("tracking");

    act(() => positionCallback(fakePosition(13.75, 100.5)));

    expect(result.current.state.route).toHaveLength(1);
  });

  it("does not append a point with poor accuracy (common indoors or with a weak signal)", async () => {
    // Regression: a single degraded fix (accuracy in meters of radius
    // uncertainty, routinely hundreds of meters indoors) used to be
    // appended unconditionally, permanently inflating the recorded route
    // and distance with no way to correct it after the fact.
    const { result } = renderHook(() => useGpsTracker());
    await act(async () => {
      await result.current.start();
    });

    act(() => positionCallback(fakePosition(13.75, 100.5, 10))); // good fix, kept
    act(() => positionCallback(fakePosition(13.76, 100.51, 200))); // poor fix, dropped
    act(() => positionCallback(fakePosition(13.751, 100.501, 45))); // borderline-good, kept

    expect(result.current.state.route).toHaveLength(2);
  });

  it("does not append a point that arrives after pause -- mirrors the interval timer's pause semantics", async () => {
    const { result } = renderHook(() => useGpsTracker());
    await act(async () => {
      await result.current.start();
    });

    act(() => positionCallback(fakePosition(13.75, 100.5)));
    act(() => result.current.pause());
    act(() => positionCallback(fakePosition(13.751, 100.501))); // arrives while paused

    expect(result.current.state.route).toHaveLength(1);
  });

  it("excludes paused duration from the total elapsed time reported by stop()", async () => {
    const { result } = renderHook(() => useGpsTracker());
    await act(async () => {
      await result.current.start();
    });

    act(() => vi.advanceTimersByTime(5_000));
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(20_000)); // must not count
    act(() => result.current.resume());
    act(() => vi.advanceTimersByTime(5_000));

    let stopResult;
    await act(async () => {
      stopResult = await result.current.stop();
    });

    expect(stopResult!.totalElapsedSeconds).toBe(10);
    expect(mockClearWatch).toHaveBeenCalledWith({ id: "watch-1" });
  });

  it("clamps elapsed time at 0 instead of going negative if the device clock jumps backward mid-session", async () => {
    // Regression: liveActiveMs computed `now - runStartedAt` with no floor,
    // so a backward clock jump (DST fallback, manual time change, NTP
    // resync) could produce a negative totalElapsedSeconds.
    const { result } = renderHook(() => useGpsTracker());
    await act(async () => {
      await result.current.start();
    });

    act(() => vi.advanceTimersByTime(5_000));
    act(() => vi.setSystemTime(new Date("2026-08-16T23:00:00.000Z"))); // clock jumps back 1 hour

    let stopResult;
    await act(async () => {
      stopResult = await result.current.stop();
    });

    expect(stopResult!.totalElapsedSeconds).toBe(0);
    expect(stopResult!.totalElapsedSeconds).not.toBeLessThan(0);
  });

  it("resets back to idle with an empty route", async () => {
    const { result } = renderHook(() => useGpsTracker());
    await act(async () => {
      await result.current.start();
    });
    act(() => positionCallback(fakePosition(13.75, 100.5)));
    act(() => result.current.reset());

    expect(result.current.state.status).toBe("idle");
    expect(result.current.state.route).toHaveLength(0);
  });
});
