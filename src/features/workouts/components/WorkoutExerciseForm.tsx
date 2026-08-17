import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { workoutExerciseSchema, type WorkoutExerciseFormData } from "@/features/workouts/schemas/workoutExerciseSchema";
import { useWorkoutExerciseStore } from "@/features/workouts/store/workoutExerciseStore";
import { WORKOUT_ICON_OPTIONS, getWorkoutIcon } from "@/features/workouts/constants/icons";
import { getExerciseCategoryLabels } from "@/features/workouts/constants/labels";
import { numberOrUndefined } from "@/utils/numberField";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { ExerciseCategory, WorkoutExercise } from "@/features/workouts/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const blankValues: WorkoutExerciseFormData = {
  name: "",
  category: "strength",
  icon: "dumbbell",
  color: "#3b82f6",
  caloriesPerMinute: undefined,
  caloriesPerRep: undefined,
  caloriesPerKm: undefined,
  gpsTracked: false,
  youtubeUrl: "",
};

interface Props {
  exercise: WorkoutExercise | null;
  onDone: () => void;
}

export default function WorkoutExerciseForm({ exercise, onDone }: Props) {
  const { addExercise, updateExercise } = useWorkoutExerciseStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const schema = useMemo(() => workoutExerciseSchema(t), [t]);
  const categoryLabels = getExerciseCategoryLabels(t);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<WorkoutExerciseFormData>({
    resolver: zodResolver(schema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(exercise ?? blankValues);
    setSubmitError(null);
  }, [exercise, reset]);

  const SelectedIcon = getWorkoutIcon(watch("icon"));

  async function onSubmit(data: WorkoutExerciseFormData) {
    setSubmitError(null);
    const isEditing = exercise?.id !== undefined;

    try {
      if (exercise?.id !== undefined) {
        await updateExercise(exercise.id, { ...exercise, ...data });
      } else {
        await addExercise({ ...data, createdAt: new Date().toISOString() });
      }

      onDone();
      toast.success(isEditing ? t("workouts.exerciseUpdatedSuccess") : t("workouts.exerciseSavedSuccess"));
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
      <h2 className="text-xl font-bold">{exercise ? t("workouts.editExercise") : t("workouts.addExercise")}</h2>

      <FormField label={t("workouts.exerciseNameLabel")} htmlFor="exercise-name" error={errors.name?.message}>
        <input
          id="exercise-name"
          {...register("name")}
          placeholder={t("workouts.exerciseNamePlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("workouts.categoryLabel")} htmlFor="exercise-category">
        <select id="exercise-category" {...register("category")} className={inputClassName}>
          {(Object.keys(categoryLabels) as ExerciseCategory[]).map((key) => (
            <option key={key} value={key}>
              {categoryLabels[key]}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("workouts.iconLabel")} htmlFor="exercise-icon">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: watch("color") }}
          >
            <SelectedIcon size={20} />
          </div>

          <select id="exercise-icon" {...register("icon")} className={inputClassName}>
            {WORKOUT_ICON_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      </FormField>

      <FormField label={t("workouts.colorLabel")} htmlFor="exercise-color">
        <input
          id="exercise-color"
          type="color"
          {...register("color")}
          className="h-11 w-full cursor-pointer rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-1"
        />
      </FormField>

      <div className="grid grid-cols-3 gap-3">
        <FormField label={t("workouts.caloriesPerMinuteLabel")} htmlFor="exercise-cal-per-min">
          <input
            id="exercise-cal-per-min"
            type="number"
            step="any"
            min={0}
            {...register("caloriesPerMinute", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>

        <FormField label={t("workouts.caloriesPerRepLabel")} htmlFor="exercise-cal-per-rep">
          <input
            id="exercise-cal-per-rep"
            type="number"
            step="any"
            min={0}
            {...register("caloriesPerRep", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>

        <FormField label={t("workouts.caloriesPerKmLabel")} htmlFor="exercise-cal-per-km">
          <input
            id="exercise-cal-per-km"
            type="number"
            step="any"
            min={0}
            {...register("caloriesPerKm", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("gpsTracked")} className="h-4 w-4 rounded" />
        {t("workouts.gpsTrackedLabel")}
      </label>

      <FormField label={t("workouts.youtubeUrlLabel")} htmlFor="exercise-youtube-url">
        <input
          id="exercise-youtube-url"
          {...register("youtubeUrl")}
          placeholder={t("workouts.youtubeUrlPlaceholder")}
          className={inputClassName}
        />
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
