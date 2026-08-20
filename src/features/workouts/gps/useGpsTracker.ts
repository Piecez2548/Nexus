import { useCallback, useEffect, useRef, useState } from "react";
import { Geolocation } from "@capacitor/geolocation";

import type { GeoPoint } from "@/features/workouts/types";
import { computeRouteDistanceMeters } from "./distance";
import type { GpsFinishResult, GpsTrackerState } from "./types";

function idleState(): GpsTrackerState {
  return { status: "idle", route: [], runStartedAt: null, bankedActiveMs: 0 };
}

// A position reading this imprecise (radius, in meters) is common indoors,
// in an urban canyon, or with a weak signal, and is not a real movement --
// appending it to the route would permanently and silently inflate the
// live/final distance with no way to correct it after the fact.
const MAX_ACCEPTABLE_ACCURACY_METERS = 50;

// Floored at 0: a monotonic clock isn't available cross-platform here, so a
// backward jump in the device clock (DST fallback, manual time change, NTP
// resync) could otherwise produce a negative value that flows into a
// negative duration and negative calories on the saved workout entry.
function liveActiveMs(state: GpsTrackerState, now: number): number {
  const elapsed = state.status === "tracking" && state.runStartedAt !== null ? Math.max(0, now - state.runStartedAt) : 0;
  return state.bankedActiveMs + elapsed;
}

// Ephemeral hook, not a Zustand store -- same reasoning as useIntervalTimer:
// only the tracker drawer itself ever reads this. Foreground-only, like the
// interval timer: watchPosition stops the moment the component unmounts, no
// background-location permission is ever requested.
export function useGpsTracker() {
  const [state, setState] = useState<GpsTrackerState>(idleState);
  const [now, setNow] = useState(() => Date.now());
  const watchIdRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (state.status !== "tracking") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [state.status]);

  // Belt-and-suspenders: clears the native watch if the component unmounts
  // mid-session (e.g. navigating away) without an explicit stop().
  useEffect(() => {
    return () => {
      if (watchIdRef.current) void Geolocation.clearWatch({ id: watchIdRef.current });
    };
  }, []);

  const start = useCallback(async () => {
    await Geolocation.requestPermissions();

    const id = await Geolocation.watchPosition({ enableHighAccuracy: true }, (position, err) => {
      if (err || !position) return;
      if (position.coords.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) return;

      const point: GeoPoint = { lat: position.coords.latitude, lng: position.coords.longitude, t: Date.now() };
      // Only appends while actually tracking -- a position callback that
      // fires just after pause() must not add a point, mirroring the
      // interval timer's pause semantics exactly.
      setState((prev) => (prev.status === "tracking" ? { ...prev, route: [...prev.route, point] } : prev));
    });

    watchIdRef.current = id;
    setNow(Date.now());
    setState({ status: "tracking", route: [], runStartedAt: Date.now(), bankedActiveMs: 0 });
  }, []);

  const pause = useCallback(() => {
    setState((prev) =>
      prev.status === "tracking"
        ? { ...prev, status: "paused", bankedActiveMs: liveActiveMs(prev, Date.now()), runStartedAt: null }
        : prev,
    );
  }, []);

  const resume = useCallback(() => {
    setNow(Date.now());
    setState((prev) => (prev.status === "paused" ? { ...prev, status: "tracking", runStartedAt: Date.now() } : prev));
  }, []);

  const stop = useCallback(async (): Promise<GpsFinishResult> => {
    if (watchIdRef.current) {
      await Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }

    const finalState = stateRef.current;
    const finalNow = Date.now();
    const result: GpsFinishResult = {
      totalElapsedSeconds: Math.round(liveActiveMs(finalState, finalNow) / 1000),
      distanceMeters: computeRouteDistanceMeters(finalState.route),
      route: finalState.route,
    };

    setState(idleState());
    return result;
  }, []);

  const reset = useCallback(() => {
    if (watchIdRef.current) {
      void Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }
    setState(idleState());
  }, []);

  return {
    state,
    liveActiveMs: liveActiveMs(state, now),
    liveDistanceMeters: computeRouteDistanceMeters(state.route),
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
