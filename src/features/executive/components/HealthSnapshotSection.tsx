import { Flame, Dumbbell } from "lucide-react";

import SummaryCard from "@/components/ui/SummaryCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { ExecutiveHealthSnapshot } from "@/features/executive/types";

interface Props {
  health: ExecutiveHealthSnapshot;
}

export default function HealthSnapshotSection({ health }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="mb-5 text-xl font-semibold">{t("executive.health.title")}</h2>

      <div className="grid grid-cols-2 gap-4">
        <SummaryCard
          title={t("executive.health.habitsToday")}
          value={`${health.habitsCheckedInToday.done}/${health.habitsCheckedInToday.total}`}
          icon={<Flame size={20} />}
          color="#f97316"
        />

        <SummaryCard
          title={t("executive.health.workoutDays")}
          value={`${health.workoutDaysThisWeek.done}/${health.workoutDaysThisWeek.total}`}
          icon={<Dumbbell size={20} />}
          color="#7c3aed"
        />
      </div>
    </div>
  );
}
