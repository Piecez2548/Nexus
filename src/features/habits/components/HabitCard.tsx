import { Pencil, Trash2, Flame, Check } from "lucide-react";

import { useHabitStore } from "@/features/habits/store/habitStore";
import { computeStreak, getRecentDates, isCompletedToday } from "@/features/habits/utils/streak";
import { getFrequencyLabels, FREQUENCY_BADGE_CLASS } from "@/features/habits/constants/labels";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import type { Habit } from "@/features/habits/types";

const HISTORY_DAYS = 14;

interface Props {
  habit: Habit;
  onEdit: () => void;
}

export default function HabitCard({ habit, onEdit }: Props) {
  const { deleteHabit, checkIn } = useHabitStore();
  const { t } = useTranslation();
  const toast = useToast();
  const frequencyLabels = getFrequencyLabels(t);

  const streak = computeStreak(habit.completedDates, habit.frequency);
  const doneToday = isCompletedToday(habit.completedDates);
  const recentDates = getRecentDates(HISTORY_DAYS);

  async function handleDelete() {
    if (habit.id === undefined) return;

    try {
      await deleteHabit(habit.id);
      toast.success(t("habits.deletedSuccess"));
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  }

  async function handleCheckIn() {
    if (habit.id === undefined || doneToday) return;
    await checkIn(habit.id);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{habit.name}</h3>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${FREQUENCY_BADGE_CLASS[habit.frequency]}`}>
            {frequencyLabels[habit.frequency]}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            aria-label={t("habits.editHabit", { name: habit.name })}
            className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={handleDelete}
            aria-label={t("habits.deleteHabit", { name: habit.name })}
            className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-1 text-sm font-medium text-orange-500">
        <Flame size={16} />
        {habit.frequency === "daily"
          ? t("habits.dayStreak", { count: streak })
          : t("habits.weekStreak", { count: streak })}
      </div>

      <div className="mb-4 flex gap-1">
        {recentDates.map((date) => (
          <span
            key={date}
            title={date}
            className={`h-2.5 w-2.5 flex-1 rounded-full ${
              habit.completedDates.includes(date) ? "bg-brand-500" : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleCheckIn}
        disabled={doneToday}
        aria-label={doneToday ? t("habits.alreadyDoneToday", { name: habit.name }) : t("habits.markDoneToday", { name: habit.name })}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition ${
          doneToday
            ? "cursor-default bg-green-500/15 text-green-500"
            : "bg-brand-600 text-white hover:bg-brand-700"
        }`}
      >
        <Check size={16} />
        {doneToday ? t("habits.alreadyDoneToday", { name: habit.name }) : t("habits.markDoneToday", { name: habit.name })}
      </button>
    </div>
  );
}
