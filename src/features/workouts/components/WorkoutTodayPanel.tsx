import { Flame, Clock, Repeat, Layers, Dumbbell } from "lucide-react";

import { computeTodaySummary, getLoggedDates } from "@/features/workouts/utils/todaySummary";
import { getRecentDates, computeStreak } from "@/features/habits/utils/streak";
import SummaryCard from "@/components/ui/SummaryCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { WorkoutEntry } from "@/features/workouts/types";

const HISTORY_DAYS = 14;

interface Props {
  entries: WorkoutEntry[];
}

// Reuses getRecentDates/computeStreak from @/features/habits/utils/streak
// directly -- both pure and generic despite living under features/habits/,
// deliberate reuse rather than re-deriving the grace-period streak logic.
export default function WorkoutTodayPanel({ entries }: Props) {
  const { t } = useTranslation();
  const summary = computeTodaySummary(entries);
  const loggedDates = getLoggedDates(entries);
  const recentDates = getRecentDates(HISTORY_DAYS);
  const streak = computeStreak(loggedDates, "daily");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <SummaryCard
          title={t("workouts.summaryCalories")}
          value={String(summary.totalCalories)}
          icon={<Flame size={18} className="text-white" />}
          color="#f97316"
        />
        <SummaryCard
          title={t("workouts.summaryDuration")}
          value={t("workouts.minutesValue", { minutes: summary.totalDurationMinutes })}
          icon={<Clock size={18} className="text-white" />}
          color="#3b82f6"
        />
        <SummaryCard
          title={t("workouts.summaryReps")}
          value={String(summary.totalReps)}
          icon={<Repeat size={18} className="text-white" />}
          color="#8b5cf6"
        />
        <SummaryCard
          title={t("workouts.summaryRounds")}
          value={String(summary.totalRounds)}
          icon={<Layers size={18} className="text-white" />}
          color="#10b981"
        />
        <SummaryCard
          title={t("workouts.summaryExercises")}
          value={String(summary.exerciseCount)}
          icon={<Dumbbell size={18} className="text-white" />}
          color="#ec4899"
        />
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div className="mb-3 flex items-center gap-1 text-sm font-medium text-orange-500">
          <Flame size={16} />
          {t("workouts.dayStreak", { count: streak })}
        </div>
        <div className="flex gap-1">
          {recentDates.map((date) => (
            <span
              key={date}
              title={date}
              className={`h-2.5 w-2.5 flex-1 rounded-full ${loggedDates.includes(date) ? "bg-brand-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
