import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { workoutEntrySchema, type WorkoutEntryFormData } from "@/features/workouts/schemas/workoutEntrySchema";
import { useWorkoutEntryStore } from "@/features/workouts/store/workoutEntryStore";
import { useWorkoutExerciseStore } from "@/features/workouts/store/workoutExerciseStore";
import { computeCaloriesBurned } from "@/features/workouts/utils/calorieCalc";
import WorkoutRouteMap from "@/features/workouts/components/WorkoutRouteMap";
import { numberOrUndefined } from "@/utils/numberField";
import { toErrorMessage } from "@/utils/asyncState";
import { toLocalDateString } from "@/utils/localDate";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { GeoPoint, WorkoutEntry } from "@/features/workouts/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

// Carries the interval timer's or GPS tracker's handoff into a new entry --
// exerciseName/durationMinutes/rounds from the timer, or
// durationMinutes/distanceMeters/route from the GPS tracker. The user still
// confirms/edits every field before saving.
export interface WorkoutEntryPrefill {
  exerciseName?: string;
  durationMinutes?: number;
  rounds?: number;
  distanceMeters?: number;
  route?: GeoPoint[];
}

interface Props {
  entry: WorkoutEntry | null;
  prefill?: WorkoutEntryPrefill | null;
  onDone: () => void;
}

function blankValues(prefill?: WorkoutEntryPrefill | null): WorkoutEntryFormData {
  return {
    exerciseName: prefill?.exerciseName ?? "",
    date: toLocalDateString(new Date()),
    reps: undefined,
    rounds: prefill?.rounds,
    durationMinutes: prefill?.durationMinutes,
    distanceMeters: prefill?.distanceMeters,
    caloriesBurned: 0,
    note: "",
  };
}

export default function WorkoutEntryForm({ entry, prefill, onDone }: Props) {
  const { addEntry, updateEntry } = useWorkoutEntryStore();
  const { exercises } = useWorkoutExerciseStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [route, setRoute] = useState<GeoPoint[] | undefined>(prefill?.route ?? entry?.route);
  const toast = useToast();
  const { t } = useTranslation();
  const schema = useMemo(() => workoutEntrySchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<WorkoutEntryFormData>({
    resolver: zodResolver(schema),
    defaultValues: blankValues(prefill),
  });

  useEffect(() => {
    reset(entry ?? blankValues(prefill));
    setRoute(prefill?.route ?? entry?.route);
    setSubmitError(null);
    // Only re-run when the target entry/prefill actually changes -- reset
    // and setRoute are stable across a single open/edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, prefill]);

  const watchedExerciseName = watch("exerciseName");
  const watchedReps = watch("reps");
  const watchedRounds = watch("rounds");
  const watchedDuration = watch("durationMinutes");
  const watchedDistance = watch("distanceMeters");

  const selectedExercise = exercises.find((ex) => ex.name === watchedExerciseName);

  // Live estimate -- pre-fills caloriesBurned reactively, but the field
  // stays user-editable; the persisted value is whatever's in it at submit
  // (calorieCalc.ts's contract: computed once, then frozen).
  useEffect(() => {
    if (!selectedExercise) return;
    const estimate = computeCaloriesBurned(selectedExercise, {
      reps: watchedReps,
      rounds: watchedRounds,
      durationMinutes: watchedDuration,
      distanceMeters: watchedDistance,
    });
    setValue("caloriesBurned", estimate);
  }, [selectedExercise, watchedReps, watchedRounds, watchedDuration, watchedDistance, setValue]);

  async function onSubmit(data: WorkoutEntryFormData) {
    setSubmitError(null);
    const isEditing = entry?.id !== undefined;

    try {
      const payload: WorkoutEntry = { ...data, route, createdAt: entry?.createdAt ?? new Date().toISOString() };

      if (entry?.id !== undefined) {
        await updateEntry(entry.id, { ...entry, ...payload });
      } else {
        await addEntry(payload);
      }

      onDone();
      toast.success(isEditing ? t("workouts.entryUpdatedSuccess") : t("workouts.entrySavedSuccess"));
    } catch (err) {
      const message = toErrorMessage(err);
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">{entry ? t("workouts.editEntry") : t("workouts.addEntry")}</h2>

      <FormField label={t("workouts.exerciseLabel")} htmlFor="entry-exercise" error={errors.exerciseName?.message}>
        {exercises.length > 0 ? (
          <select id="entry-exercise" {...register("exerciseName")} className={inputClassName}>
            <option value="">{t("workouts.selectExercise")}</option>
            {exercises.map((ex) => (
              <option key={ex.id ?? ex.name} value={ex.name}>
                {ex.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="entry-exercise"
            {...register("exerciseName")}
            placeholder={t("workouts.exerciseNamePlaceholder")}
            className={inputClassName}
          />
        )}
      </FormField>

      <FormField label={t("workouts.dateLabel")} htmlFor="entry-date" error={errors.date?.message}>
        <input id="entry-date" type="date" {...register("date")} className={inputClassName} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label={t("workouts.repsLabel")} htmlFor="entry-reps">
          <input
            id="entry-reps"
            type="number"
            min={0}
            {...register("reps", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>

        <FormField label={t("workouts.roundsLabel")} htmlFor="entry-rounds">
          <input
            id="entry-rounds"
            type="number"
            min={0}
            {...register("rounds", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label={t("workouts.durationMinutesLabel")} htmlFor="entry-duration">
          <input
            id="entry-duration"
            type="number"
            step="any"
            min={0}
            {...register("durationMinutes", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>

        {(selectedExercise?.gpsTracked || (route && route.length > 0)) && (
          <FormField label={t("workouts.distanceMetersLabel")} htmlFor="entry-distance">
            <input
              id="entry-distance"
              type="number"
              step="any"
              min={0}
              {...register("distanceMeters", { setValueAs: numberOrUndefined })}
              className={inputClassName}
            />
          </FormField>
        )}
      </div>

      {route && route.length > 0 && <WorkoutRouteMap route={route} height={160} />}

      <FormField label={t("workouts.caloriesBurnedLabel")} htmlFor="entry-calories">
        <input
          id="entry-calories"
          type="number"
          step="any"
          min={0}
          {...register("caloriesBurned", { valueAsNumber: true })}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("workouts.noteLabel")} htmlFor="entry-note">
        <textarea id="entry-note" {...register("note")} rows={2} className={inputClassName} />
      </FormField>

      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("workouts.saving") : t("common.save")}
      </button>
    </form>
  );
}
