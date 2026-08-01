import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";

import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";
import { getCurrentAndNext } from "@/features/schedule/utils/activity";
import { getIcon } from "@/features/schedule/constants/icons";
import { useNowTick } from "@/features/schedule/hooks/useNowTick";
import NextActivityLine from "@/features/schedule/components/NextActivityLine";
import IconBadge from "@/components/ui/IconBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import { useTranslation } from "@/i18n/useTranslation";

export default function SchedulePreviewPanel() {
  const { items, loadItems } = useScheduleItemStore();
  const { t } = useTranslation();
  const now = useNowTick();

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const { current, currentProgress, next, nextDate } = getCurrentAndNext(items, now);
  const CurrentIcon = current ? getIcon(current.icon) : null;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("dashboard.lifeSchedule")}</h2>

        <Link to="/schedule" className="flex items-center gap-1 text-sm text-brand-500 hover:underline">
          <Clock size={16} />
          {t("common.viewAll")}
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">{t("dashboard.noScheduleItems")}</div>
      ) : (
        <div className="space-y-4">
          {current && CurrentIcon ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <IconBadge icon={<CurrentIcon size={18} />} color={current.color} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{current.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("dashboard.currentActivity")}</p>
                </div>
              </div>
              <ProgressBar percentage={currentProgress ?? 0} />
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("schedule.noCurrentActivity")}</p>
          )}

          {next && <NextActivityLine next={next} nextDate={nextDate} now={now} className="text-xs text-zinc-500 dark:text-zinc-400" />}
        </div>
      )}
    </div>
  );
}
