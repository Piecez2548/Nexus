import { Pencil, Trash2, Flame, Clock, Repeat } from "lucide-react";

import { useWorkoutEntryStore } from "@/features/workouts/store/workoutEntryStore";
import { useWorkoutExerciseStore } from "@/features/workouts/store/workoutExerciseStore";
import { getWorkoutIcon } from "@/features/workouts/constants/icons";
import WorkoutRouteMap from "@/features/workouts/components/WorkoutRouteMap";
import IconBadge from "@/components/ui/IconBadge";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import type { WorkoutEntry } from "@/features/workouts/types";

interface Props {
  entry: WorkoutEntry;
  onEdit: () => void;
}

export default function WorkoutEntryCard({ entry, onEdit }: Props) {
  const { deleteEntry } = useWorkoutEntryStore();
  const { exercises } = useWorkoutExerciseStore();
  const { t } = useTranslation();
  const toast = useToast();

  const exercise = exercises.find((ex) => ex.name === entry.exerciseName);
  const Icon = getWorkoutIcon(exercise?.icon ?? "more-horizontal");

  async function handleDelete() {
    if (entry.id === undefined) return;
    try {
      await deleteEntry(entry.id);
      toast.success(t("workouts.entryDeletedSuccess"));
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon={<Icon size={18} />} color={exercise?.color ?? "#71717a"} />
          <div>
            <h3 className="font-semibold">{entry.exerciseName}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{entry.date}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            aria-label={t("workouts.editEntry")}
            className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={() => void handleDelete()}
            aria-label={t("workouts.deleteEntry")}
            className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {entry.route && entry.route.length > 0 && <div className="mb-3"><WorkoutRouteMap route={entry.route} height={140} /></div>}

      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
        {entry.reps !== undefined && (
          <span className="flex items-center gap-1">
            <Repeat size={14} />
            {t("workouts.repsRoundsSummary", { reps: entry.reps, rounds: entry.rounds ?? 1 })}
          </span>
        )}
        {entry.durationMinutes !== undefined && (
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {t("workouts.durationSummary", { minutes: entry.durationMinutes })}
          </span>
        )}
        {entry.distanceMeters !== undefined && (
          <span className="flex items-center gap-1">
            {t("workouts.distanceSummary", { km: (entry.distanceMeters / 1000).toFixed(2) })}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 font-semibold text-orange-500">
          <Flame size={14} />
          {t("workouts.caloriesSummary", { calories: entry.caloriesBurned })}
        </span>
      </div>

      {entry.note && <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{entry.note}</p>}
    </div>
  );
}
