import { useCallback, useEffect, useReducer, useState } from "react";

import type { TimerConfig, TimerFinishResult, TimerState } from "./types";

const TICK_MS = 250;

type Action =
  | { type: "START"; config: TimerConfig }
  | { type: "PAUSE"; now: number }
  | { type: "RESUME"; now: number }
  | { type: "TICK"; now: number }
  | { type: "RESET" };

function idleState(config: TimerConfig): TimerState {
  return {
    status: "idle",
    phase: "work",
    currentRound: 1,
    runStartedAt: null,
    bankedActiveMs: 0,
    phaseBankedActiveMsAtStart: 0,
    config,
  };
}

// Timestamp-based, not per-tick decrement -- immune to drift if a render is
// delayed, since everything derives from Date.now() rather than an
// accumulated subtraction.
export function liveActiveMs(state: TimerState, now: number): number {
  return state.bankedActiveMs + (state.status === "running" && state.runStartedAt !== null ? now - state.runStartedAt : 0);
}

export function remainingMs(state: TimerState, now: number): number {
  const limitMs = (state.phase === "work" ? state.config.workSeconds : state.config.restSeconds) * 1000;
  return Math.max(0, limitMs - (liveActiveMs(state, now) - state.phaseBankedActiveMsAtStart));
}

function advanceRound(state: TimerState, active: number): TimerState {
  if (state.currentRound < state.config.totalRounds) {
    return { ...state, phase: "work", currentRound: state.currentRound + 1, phaseBankedActiveMsAtStart: active };
  }
  return { ...state, status: "complete", bankedActiveMs: active, runStartedAt: null };
}

// A configured restSeconds === 0 means "no rest phase at all" -- work
// completing skips straight to the round-advance instead of a zero-length
// rest phase.
function advancePhase(state: TimerState, now: number): TimerState {
  const active = liveActiveMs(state, now);

  if (state.phase === "work" && state.config.restSeconds > 0) {
    return { ...state, phase: "rest", phaseBankedActiveMsAtStart: active };
  }
  return advanceRound(state, active);
}

function reducer(state: TimerState, action: Action): TimerState {
  switch (action.type) {
    case "START":
      return {
        status: "running",
        phase: "work",
        currentRound: 1,
        runStartedAt: action.config ? Date.now() : null,
        bankedActiveMs: 0,
        phaseBankedActiveMsAtStart: 0,
        config: action.config,
      };

    case "PAUSE":
      if (state.status !== "running") return state;
      return { ...state, status: "paused", bankedActiveMs: liveActiveMs(state, action.now), runStartedAt: null };

    case "RESUME":
      if (state.status !== "paused") return state;
      return { ...state, status: "running", runStartedAt: action.now };

    case "TICK": {
      if (state.status !== "running") return state;
      if (remainingMs(state, action.now) > 0) return state;

      // Cascades through any zero-duration phases (e.g. a configured
      // workSeconds/restSeconds of 0) in one tick rather than waiting for
      // subsequent ticks to catch up.
      let next = advancePhase(state, action.now);
      let guard = 0;
      while (next.status === "running" && remainingMs(next, action.now) <= 0 && guard < 100) {
        next = advancePhase(next, action.now);
        guard++;
      }
      return next;
    }

    case "RESET":
      return idleState(state.config);

    default:
      return state;
  }
}

function finishResult(state: TimerState, now: number): TimerFinishResult {
  const totalElapsedSeconds = Math.round(liveActiveMs(state, now) / 1000);
  // Stopped mid-work-phase: that partial round doesn't count. Mid-rest or a
  // naturally completed session both mean the round it's currently on (or
  // just finished) is done.
  const roundsCompleted =
    state.phase === "rest" || state.status === "complete" ? state.currentRound : Math.max(0, state.currentRound - 1);
  return { totalElapsedSeconds, roundsCompleted };
}

export function useIntervalTimer(defaultConfig: TimerConfig) {
  const [state, dispatch] = useReducer(reducer, defaultConfig, idleState);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state.status !== "running") return;

    const interval = setInterval(() => {
      const t = Date.now();
      setNow(t);
      dispatch({ type: "TICK", now: t });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [state.status]);

  const start = useCallback((config: TimerConfig) => {
    setNow(Date.now());
    dispatch({ type: "START", config });
  }, []);

  const pause = useCallback(() => dispatch({ type: "PAUSE", now: Date.now() }), []);
  const resume = useCallback(() => {
    setNow(Date.now());
    dispatch({ type: "RESUME", now: Date.now() });
  }, []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  // Callable from running/paused/complete -- both a naturally completed
  // session and a "stop & log" mid-session hand off the same shape.
  const finish = useCallback((): TimerFinishResult => {
    const result = finishResult(state, Date.now());
    dispatch({ type: "RESET" });
    return result;
  }, [state]);

  return {
    state,
    remainingMs: remainingMs(state, now),
    liveActiveMs: liveActiveMs(state, now),
    start,
    pause,
    resume,
    reset,
    finish,
  };
}
