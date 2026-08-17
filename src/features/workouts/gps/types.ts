import type { GeoPoint } from "@/features/workouts/types";

export type GpsTrackerStatus = "idle" | "tracking" | "paused" | "stopped";

export interface GpsTrackerState {
  status: GpsTrackerStatus;
  route: GeoPoint[];
  runStartedAt: number | null; // epoch ms the current tracking segment began
  bankedActiveMs: number; // total active ms, excluding the in-progress segment -- mirrors useIntervalTimer
}

export interface GpsFinishResult {
  totalElapsedSeconds: number;
  distanceMeters: number;
  route: GeoPoint[];
}
