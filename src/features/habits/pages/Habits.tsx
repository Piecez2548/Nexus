import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useHabitStore } from "@/features/habits/store/habitStore";
import HabitCard from "@/features/habits/components/HabitCard";
import HabitForm from "@/features/habits/components/HabitForm";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { Habit } from "@/features/habits/types";

export default function Habits() {
  const { habits, loading, error, loadHabits } = useHabitStore();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  function handleAdd() {
    setSelectedHabit(null);
    setIsDrawerOpen(true);
  }

  function handleEdit(habit: Habit) {
    setSelectedHabit(habit);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedHabit(null);
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("habits.pageTitle")}</h1>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("habits.addHabit")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadHabits} />
      ) : loading && habits.length === 0 ? (
        <LoadingState label={t("habits.loading")} />
      ) : habits.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("habits.emptyState")}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} onEdit={() => handleEdit(habit)} />
          ))}
        </div>
      )}

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <HabitForm habit={selectedHabit} onDone={handleClose} />
      </Drawer>

    </div>
  );
}
