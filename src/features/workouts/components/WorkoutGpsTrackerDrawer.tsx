import { useState } from "react";
import { Play, Pause, Square } from "lucide-react";

import { useGpsTracker } from "@/features/workouts/gps/useGpsTracker";
import WorkoutRouteMap from "@/features/workouts/components/WorkoutRouteMap";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import { toErrorMessage } from "@/utils/asyncState";
import type { GeoPoint } from "@/features/workouts/types";

export interface GpsFinishPrefill {
  durationMinutes: number;
  distanceMeters: number;
  route: GeoPoint[];
}

interface Props {
  onFinish: (prefill: GpsFinishPrefill) => void;
  onCancel: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDistanceKm(meters: number): string {
  return (meters / 1000).toFixed(2);
}

function formatPaceMinPerKm(ms: number, meters: number): string {
  if (meters < 10) return "--:--";
  const km = meters / 1000;
  const paceMinutes = ms / 1000 / 60 / km;
  const minutes = Math.floor(paceMinutes);
  const seconds = Math.round((paceMinutes - minutes) * 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Owns useGpsTracker + the live map/stat overlay + start/pause/resume/stop.
// Foreground-only, like the interval timer -- see useGpsTracker.ts.
export default function WorkoutGpsTrackerDrawer({ onFinish, onCancel }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const gps = useGpsTracker();
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    setStarting(true);
    try {
      await gps.start();
    } catch (err) {
      toast.error(toErrorMessage(err, t("workouts.gpsPermissionDenied")));
    } finally {
      setStarting(false);
    }
  }

  async function handleStop() {
    const result = await gps.stop();
    onFinish({
      durationMinutes: Math.round((result.totalElapsedSeconds / 60) * 10) / 10,
      distanceMeters: Math.round(result.distanceMeters),
      route: result.route,
    });
  }

  function handleCancel() {
    gps.reset();
    onCancel();
  }

  if (gps.state.status === "idle") {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-xl font-bold">{t("workouts.gpsTrackerTitle")}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("workouts.gpsTrackerSubtitle")}</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={starting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Play size={16} />
            {starting ? t("workouts.gpsRequestingPermission") : t("workouts.startGpsTracking")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <WorkoutRouteMap route={gps.state.route} height={260} interactive />

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("workouts.elapsedLabel")}</p>
          <p className="text-lg font-bold tabular-nums">{formatDuration(gps.liveActiveMs)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("workouts.distanceLabel")}</p>
          <p className="text-lg font-bold tabular-nums">
            {formatDistanceKm(gps.liveDistanceMeters)} {t("workouts.km")}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("workouts.paceLabel")}</p>
          <p className="text-lg font-bold tabular-nums">{formatPaceMinPerKm(gps.liveActiveMs, gps.liveDistanceMeters)}</p>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        {gps.state.status === "tracking" ? (
          <button
            type="button"
            onClick={gps.pause}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Pause size={16} />
            {t("workouts.pause")}
          </button>
        ) : (
          <button
            type="button"
            onClick={gps.resume}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Play size={16} />
            {t("workouts.resume")}
          </button>
        )}

        <button
          type="button"
          onClick={() => void handleStop()}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Square size={16} />
          {t("workouts.stopAndLog")}
        </button>
      </div>

      <button
        type="button"
        onClick={handleCancel}
        className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {t("common.cancel")}
      </button>
    </div>
  );
}
