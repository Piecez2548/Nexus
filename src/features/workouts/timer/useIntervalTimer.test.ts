import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIntervalTimer } from "./useIntervalTimer";

const config = { workSeconds: 10, restSeconds: 5, totalRounds: 2 };

describe("useIntervalTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in the work phase at round 1", () => {
    const { result } = renderHook(() => useIntervalTimer(config));
    act(() => result.current.start(config));

    expect(result.current.state.status).toBe("running");
    expect(result.current.state.phase).toBe("work");
    expect(result.current.state.currentRound).toBe(1);
  });

  it("transitions work -> rest exactly at the work boundary", () => {
    const { result } = renderHook(() => useIntervalTimer(config));
    act(() => result.current.start(config));

    act(() => vi.advanceTimersByTime(10_000));

    expect(result.current.state.phase).toBe("rest");
    expect(result.current.state.currentRound).toBe(1);
  });

  it("transitions rest -> the next round's work phase", () => {
    const { result } = renderHook(() => useIntervalTimer(config));
    act(() => result.current.start(config));

    act(() => vi.advanceTimersByTime(15_000)); // 10s work + 5s rest

    expect(result.current.state.phase).toBe("work");
    expect(result.current.state.currentRound).toBe(2);
  });

  it("completes once every round's work+rest has elapsed", () => {
    const { result } = renderHook(() => useIntervalTimer(config));
    act(() => result.current.start(config));

    act(() => vi.advanceTimersByTime(30_000));

    expect(result.current.state.status).toBe("complete");
  });

  it("a configured restSeconds of 0 skips straight to the next round, no rest phase", () => {
    const zeroRestConfig = { workSeconds: 10, restSeconds: 0, totalRounds: 2 };
    const { result } = renderHook(() => useIntervalTimer(zeroRestConfig));
    act(() => result.current.start(zeroRestConfig));

    act(() => vi.advanceTimersByTime(10_000));

    expect(result.current.state.phase).toBe("work");
    expect(result.current.state.currentRound).toBe(2);
  });

  it("pause freezes elapsed time -- the paused duration is excluded from a later finish()", () => {
    const longConfig = { workSeconds: 30, restSeconds: 10, totalRounds: 3 };
    const { result } = renderHook(() => useIntervalTimer(longConfig));
    act(() => result.current.start(longConfig));

    act(() => vi.advanceTimersByTime(5_000));
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(20_000)); // must not count towards elapsed
    act(() => result.current.resume());
    act(() => vi.advanceTimersByTime(5_000));

    let finishResult;
    act(() => {
      finishResult = result.current.finish();
    });
    expect(finishResult!.totalElapsedSeconds).toBe(10); // 5s + 5s active, 20s paused gap excluded
  });

  it("finish() mid-work-phase does not count the partial round", () => {
    const { result } = renderHook(() => useIntervalTimer({ workSeconds: 10, restSeconds: 5, totalRounds: 3 }));
    act(() => result.current.start({ workSeconds: 10, restSeconds: 5, totalRounds: 3 }));

    act(() => vi.advanceTimersByTime(3_000)); // still mid round 1's work phase

    let finishResult;
    act(() => {
      finishResult = result.current.finish();
    });
    expect(finishResult!.roundsCompleted).toBe(0);
  });

  it("finish() mid-rest-phase counts the round that just finished working", () => {
    const { result } = renderHook(() => useIntervalTimer({ workSeconds: 10, restSeconds: 5, totalRounds: 3 }));
    act(() => result.current.start({ workSeconds: 10, restSeconds: 5, totalRounds: 3 }));

    act(() => vi.advanceTimersByTime(12_000)); // 10s work done, 2s into rest

    let finishResult;
    act(() => {
      finishResult = result.current.finish();
    });
    expect(finishResult!.roundsCompleted).toBe(1);
  });

  it("finish() after natural completion counts every round", () => {
    const { result } = renderHook(() => useIntervalTimer(config));
    act(() => result.current.start(config));
    act(() => vi.advanceTimersByTime(30_000));

    expect(result.current.state.status).toBe("complete");

    let finishResult;
    act(() => {
      finishResult = result.current.finish();
    });
    expect(finishResult!.roundsCompleted).toBe(2);
  });

  it("clamps elapsed time at 0 instead of going negative if the device clock jumps backward mid-session", () => {
    // Regression: liveActiveMs computed `now - runStartedAt` with no floor,
    // so a backward clock jump (DST fallback, manual time change, NTP
    // resync) could produce a negative totalElapsedSeconds -- and from
    // there a negative calorie count on the saved workout entry.
    const longConfig = { workSeconds: 30, restSeconds: 10, totalRounds: 3 };
    const { result } = renderHook(() => useIntervalTimer(longConfig));
    act(() => result.current.start(longConfig));

    act(() => vi.advanceTimersByTime(5_000)); // 5s of real elapsed time banked
    act(() => vi.setSystemTime(new Date("2026-08-16T23:00:00.000Z"))); // clock jumps back 1 hour

    let finishResult;
    act(() => {
      finishResult = result.current.finish();
    });
    expect(finishResult!.totalElapsedSeconds).toBe(0);
    expect(finishResult!.totalElapsedSeconds).not.toBeLessThan(0);
  });

  it("reset returns to idle without producing a summary", () => {
    const { result } = renderHook(() => useIntervalTimer(config));
    act(() => result.current.start(config));
    act(() => vi.advanceTimersByTime(3_000));
    act(() => result.current.reset());

    expect(result.current.state.status).toBe("idle");
    expect(result.current.state.currentRound).toBe(1);
  });
});
