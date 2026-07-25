import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";

import { useHabitStore } from "@/features/habits/store/habitStore";
import { computeStreak, isCompletedToday } from "@/features/habits/utils/streak";
import { useTranslation } from "@/i18n/useTranslation";

export default function HabitPreviewPanel() {
  const { habits, loadHabits, checkIn } = useHabitStore();
  const { t } = useTranslation();

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // Not-yet-done-today habits surface first, same idea as Todo's
  // "pending first" sort — the actionable ones are visible at a glance.
  const preview = [...habits]
    .sort((a, b) => Number(isCompletedToday(a.completedDates)) - Number(isCompletedToday(b.completedDates)))
    .slice(0, 4);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("dashboard.habitTracker")}</h2>

        <Link to="/habits" className="flex items-center gap-1 text-sm text-violet-500 hover:underline">
          <Flame size={16} />
          {t("common.viewAll")}
        </Link>
      </div>

      {preview.length === 0 ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">{t("dashboard.noHabits")}</div>
      ) : (
        <div className="space-y-3">
          {preview.map((habit) => {
            const done = isCompletedToday(habit.completedDates);
            const streak = computeStreak(habit.completedDates, habit.frequency);
            return (
              <div key={habit.id} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => habit.id !== undefined && checkIn(habit.id)}
                  disabled={done}
                  aria-label={t(done ? "habits.alreadyDoneToday" : "habits.markDoneToday", { name: habit.name })}
                  className={`h-4 w-4 shrink-0 rounded-full border-2 transition ${
                    done
                      ? "border-violet-500 bg-violet-500"
                      : "border-zinc-300 dark:border-zinc-600 hover:border-violet-500"
                  }`}
                />

                <span className="min-w-0 flex-1 truncate text-sm font-medium">{habit.name}</span>

                <span className="flex shrink-0 items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-500">
                  <Flame size={12} />
                  {streak}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
