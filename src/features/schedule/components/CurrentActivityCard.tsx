import { getCurrentAndNext } from "@/features/schedule/utils/activity";
import { getIcon } from "@/features/schedule/constants/icons";
import { useNowTick } from "@/features/schedule/hooks/useNowTick";
import NextActivityLine from "@/features/schedule/components/NextActivityLine";
import IconBadge from "@/components/ui/IconBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import { useTranslation } from "@/i18n/useTranslation";
import type { ScheduleItem } from "@/features/schedule/types";

interface Props {
  items: ScheduleItem[];
}

export default function CurrentActivityCard({ items }: Props) {
  const now = useNowTick();
  const { t } = useTranslation();
  const { current, currentProgress, next, nextDate } = getCurrentAndNext(items, now);
  const CurrentIcon = current ? getIcon(current.icon) : null;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <p className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
        {t("schedule.currentActivityLabel")}
      </p>

      {current && CurrentIcon ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <IconBadge icon={<CurrentIcon size={20} />} color={current.color} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">{current.title}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {current.startTime}
                {current.endTime ? `–${current.endTime}` : ""}
              </p>
            </div>
          </div>
          <ProgressBar percentage={currentProgress ?? 0} />
        </div>
      ) : (
        <p className="text-zinc-500 dark:text-zinc-400">{t("schedule.noCurrentActivity")}</p>
      )}

      <div className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-3 text-sm text-zinc-500 dark:text-zinc-400">
        <NextActivityLine next={next} nextDate={nextDate} now={now} />
      </div>
    </div>
  );
}
