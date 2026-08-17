import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useWorkoutExerciseStore } from "@/features/workouts/store/workoutExerciseStore";
import { useWorkoutEntryStore } from "@/features/workouts/store/workoutEntryStore";
import WorkoutExerciseCard from "@/features/workouts/components/WorkoutExerciseCard";
import WorkoutExerciseForm from "@/features/workouts/components/WorkoutExerciseForm";
import WorkoutEntryCard from "@/features/workouts/components/WorkoutEntryCard";
import WorkoutEntryForm, { type WorkoutEntryPrefill } from "@/features/workouts/components/WorkoutEntryForm";
import WorkoutTodayPanel from "@/features/workouts/components/WorkoutTodayPanel";
import WorkoutTimerDrawer from "@/features/workouts/components/WorkoutTimerDrawer";
import WorkoutGpsTrackerDrawer from "@/features/workouts/components/WorkoutGpsTrackerDrawer";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { WorkoutEntry, WorkoutExercise } from "@/features/workouts/types";

type ActiveView =
  | { type: "exercise"; exercise: WorkoutExercise | null }
  | { type: "entry"; entry: WorkoutEntry | null; prefill: WorkoutEntryPrefill | null }
  | { type: "timer"; exerciseName: string }
  | { type: "gps"; exerciseName: string }
  | null;

export default function Workouts() {
  const { exercises, loading: exercisesLoading, error: exercisesError, loadExercises } = useWorkoutExerciseStore();
  const { entries, loading: entriesLoading, error: entriesError, loadEntries } = useWorkoutEntryStore();
  const [activeView, setActiveView] = useState<ActiveView>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadExercises();
    loadEntries();
  }, [loadExercises, loadEntries]);

  function close() {
    setActiveView(null);
  }

  function retry() {
    loadExercises();
    loadEntries();
  }

  const sortedEntries = [...entries].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const loading = (exercisesLoading && exercises.length === 0) || (entriesLoading && entries.length === 0);
  const error = exercisesError ?? entriesError;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t("workouts.pageTitle")}</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveView({ type: "exercise", exercise: null })}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Plus size={18} />
            {t("workouts.addExercise")}
          </button>
          <button
            onClick={() => setActiveView({ type: "entry", entry: null, prefill: null })}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            <Plus size={18} />
            {t("workouts.addEntry")}
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : loading ? (
        <LoadingState label={t("workouts.loading")} />
      ) : (
        <>
          <WorkoutTodayPanel entries={entries} />

          <div>
            <h2 className="mb-3 text-lg font-semibold">{t("workouts.exercisesSectionTitle")}</h2>
            {exercises.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
                {t("workouts.emptyExercisesState")}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {exercises.map((exercise) => (
                  <WorkoutExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onEdit={() => setActiveView({ type: "exercise", exercise })}
                    onStartTimer={() => setActiveView({ type: "timer", exerciseName: exercise.name })}
                    onStartGps={() => setActiveView({ type: "gps", exerciseName: exercise.name })}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">{t("workouts.activitySectionTitle")}</h2>
            {sortedEntries.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
                {t("workouts.emptyEntriesState")}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEntries.map((entry) => (
                  <WorkoutEntryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={() => setActiveView({ type: "entry", entry, prefill: null })}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Drawer open={activeView !== null} onClose={close}>
        {activeView?.type === "exercise" && <WorkoutExerciseForm exercise={activeView.exercise} onDone={close} />}

        {activeView?.type === "entry" && <WorkoutEntryForm entry={activeView.entry} prefill={activeView.prefill} onDone={close} />}

        {activeView?.type === "timer" && (
          <WorkoutTimerDrawer
            onFinish={(prefill) =>
              setActiveView({ type: "entry", entry: null, prefill: { exerciseName: activeView.exerciseName, ...prefill } })
            }
            onCancel={close}
          />
        )}

        {activeView?.type === "gps" && (
          <WorkoutGpsTrackerDrawer
            onFinish={(prefill) =>
              setActiveView({ type: "entry", entry: null, prefill: { exerciseName: activeView.exerciseName, ...prefill } })
            }
            onCancel={close}
          />
        )}
      </Drawer>
    </div>
  );
}
