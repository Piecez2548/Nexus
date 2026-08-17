import { Pencil, Trash2, PlayCircle, MapPin, Timer, Navigation } from "lucide-react";

import { useWorkoutExerciseStore } from "@/features/workouts/store/workoutExerciseStore";
import { getWorkoutIcon } from "@/features/workouts/constants/icons";
import { getExerciseCategoryLabels, CATEGORY_BADGE_CLASS } from "@/features/workouts/constants/labels";
import { buildYoutubeUrl } from "@/features/workouts/utils/youtubeLink";
import { openExternalUrl } from "@/features/workouts/utils/openExternal";
import IconBadge from "@/components/ui/IconBadge";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import type { WorkoutExercise } from "@/features/workouts/types";

interface Props {
  exercise: WorkoutExercise;
  onEdit: () => void;
  onStartTimer: () => void;
  onStartGps: () => void;
}

export default function WorkoutExerciseCard({ exercise, onEdit, onStartTimer, onStartGps }: Props) {
  const { deleteExercise } = useWorkoutExerciseStore();
  const { t } = useTranslation();
  const toast = useToast();
  const categoryLabels = getExerciseCategoryLabels(t);
  const Icon = getWorkoutIcon(exercise.icon);

  async function handleDelete() {
    if (exercise.id === undefined) return;
    try {
      await deleteExercise(exercise.id);
      toast.success(t("workouts.exerciseDeletedSuccess"));
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  }

  async function handleWatchDemo() {
    try {
      await openExternalUrl(buildYoutubeUrl(exercise));
    } catch {
      toast.error(t("workouts.watchDemoFailed"));
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon={<Icon size={18} />} color={exercise.color} />
          <div>
            <h3 className="flex items-center gap-1.5 font-semibold">
              {exercise.name}
              {exercise.gpsTracked && <MapPin size={13} className="text-zinc-400 dark:text-zinc-500" />}
            </h3>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_BADGE_CLASS[exercise.category]}`}>
              {categoryLabels[exercise.category]}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            aria-label={t("workouts.editExercise")}
            className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={() => void handleDelete()}
            aria-label={t("workouts.deleteExercise")}
            className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onStartTimer}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Timer size={16} />
          {t("workouts.startTimer")}
        </button>

        {exercise.gpsTracked && (
          <button
            type="button"
            onClick={onStartGps}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Navigation size={16} />
            {t("workouts.startGpsTracking")}
          </button>
        )}

        <button
          type="button"
          onClick={() => void handleWatchDemo()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <PlayCircle size={16} />
          {t("workouts.watchDemo")}
        </button>
      </div>
    </div>
  );
}
