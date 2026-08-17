import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, RotateCcw } from "lucide-react";

import { useIntervalTimer } from "@/features/workouts/timer/useIntervalTimer";
import { playPhaseChangeFeedback } from "@/features/workouts/timer/timerFeedback";
import WorkoutTimerRing from "@/features/workouts/components/WorkoutTimerRing";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { TimerConfig } from "@/features/workouts/timer/types";

export interface TimerFinishPrefill {
  durationMinutes: number;
  rounds: number;
}

interface Props {
  onFinish: (prefill: TimerFinishPrefill) => void;
  onCancel: () => void;
}

const inputClassName =
  "mt-1 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const DEFAULT_CONFIG: TimerConfig = { workSeconds: 30, restSeconds: 15, totalRounds: 5 };

function toPrefill(totalElapsedSeconds: number, roundsCompleted: number): TimerFinishPrefill {
  return {
    durationMinutes: Math.round((totalElapsedSeconds / 60) * 10) / 10,
    rounds: roundsCompleted,
  };
}

// Owns useIntervalTimer + a small work/rest/rounds setup step (plain
// useState -- ephemeral config, not a form the user saves). Feeds a
// naturally-completed OR manually-stopped session into the same
// onFinish(prefill) shape, which the parent (Workouts.tsx) turns into a
// pre-filled WorkoutEntryForm.
export default function WorkoutTimerDrawer({ onFinish, onCancel }: Props) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<TimerConfig>(DEFAULT_CONFIG);
  const timer = useIntervalTimer(DEFAULT_CONFIG);
  const prevPhaseKey = useRef<string | null>(null);

  // Plays the audio+haptic cue on every phase/round change while running --
  // tracks the previous (phase, round) pair rather than firing on every
  // render.
  useEffect(() => {
    if (timer.state.status !== "running") {
      prevPhaseKey.current = null;
      return;
    }
    const key = `${timer.state.phase}-${timer.state.currentRound}`;
    if (prevPhaseKey.current !== null && prevPhaseKey.current !== key) {
      playPhaseChangeFeedback();
    }
    prevPhaseKey.current = key;
  }, [timer.state.status, timer.state.phase, timer.state.currentRound]);

  useEffect(() => {
    if (timer.state.status !== "complete") return;
    playPhaseChangeFeedback();
    const result = timer.finish();
    onFinish(toPrefill(result.totalElapsedSeconds, result.roundsCompleted));
    // Only re-run when status itself changes to "complete" -- timer.finish/
    // onFinish are stable across the single completion transition this
    // effect cares about.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.state.status]);

  function handleStopAndLog() {
    const result = timer.finish();
    onFinish(toPrefill(result.totalElapsedSeconds, result.roundsCompleted));
  }

  function handleCancel() {
    timer.reset();
    onCancel();
  }

  if (timer.state.status === "idle") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">{t("workouts.timerSetupTitle")}</h2>

        <FormField label={t("workouts.workSecondsLabel")} htmlFor="timer-work-seconds">
          <input
            id="timer-work-seconds"
            type="number"
            min={1}
            value={config.workSeconds}
            onChange={(e) => setConfig((c) => ({ ...c, workSeconds: Number(e.target.value) }))}
            className={inputClassName}
          />
        </FormField>

        <FormField label={t("workouts.restSecondsLabel")} htmlFor="timer-rest-seconds">
          <input
            id="timer-rest-seconds"
            type="number"
            min={0}
            value={config.restSeconds}
            onChange={(e) => setConfig((c) => ({ ...c, restSeconds: Number(e.target.value) }))}
            className={inputClassName}
          />
        </FormField>

        <FormField label={t("workouts.totalRoundsLabel")} htmlFor="timer-total-rounds">
          <input
            id="timer-total-rounds"
            type="number"
            min={1}
            value={config.totalRounds}
            onChange={(e) => setConfig((c) => ({ ...c, totalRounds: Number(e.target.value) }))}
            className={inputClassName}
          />
        </FormField>

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
            onClick={() => timer.start(config)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Play size={16} />
            {t("workouts.startTimer")}
          </button>
        </div>
      </div>
    );
  }

  const totalMs = (timer.state.phase === "work" ? timer.state.config.workSeconds : timer.state.config.restSeconds) * 1000;

  return (
    <div className="space-y-6 text-center">
      <div>
        <span className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {timer.state.phase === "work" ? t("workouts.phaseWork") : t("workouts.phaseRest")}
        </span>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("workouts.roundProgress", { current: timer.state.currentRound, total: timer.state.config.totalRounds })}
        </p>
      </div>

      <div className="flex justify-center">
        <WorkoutTimerRing remainingMs={timer.remainingMs} totalMs={totalMs} phase={timer.state.phase} />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {timer.state.status === "running" ? (
          <button
            type="button"
            onClick={timer.pause}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Pause size={16} />
            {t("workouts.pause")}
          </button>
        ) : (
          <button
            type="button"
            onClick={timer.resume}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Play size={16} />
            {t("workouts.resume")}
          </button>
        )}

        <button
          type="button"
          onClick={handleStopAndLog}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Square size={16} />
          {t("workouts.stopAndLog")}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          aria-label={t("common.cancel")}
          className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
