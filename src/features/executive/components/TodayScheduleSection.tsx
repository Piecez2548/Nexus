import { Link } from "react-router-dom";
import { Clock } from "lucide-react";

import { useTranslation } from "@/i18n/useTranslation";
import type { ExecutiveScheduleSnapshot } from "@/features/executive/types";

interface Props {
  schedule: ExecutiveScheduleSnapshot;
}

export default function TodayScheduleSection({ schedule }: Props) {
  const { t } = useTranslation();
  const { current, currentProgress, next } = schedule;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("executive.todaySchedule.title")}</h2>
        <Link to="/schedule" className="flex items-center gap-1 text-sm text-brand-500 hover:underline">
          <Clock size={16} />
          {t("common.viewAll")}
        </Link>
      </div>

      {!current && !next ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">{t("executive.todaySchedule.empty")}</div>
      ) : (
        <div className="space-y-4">
          {current && (
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t("executive.todaySchedule.current")}
              </p>
              <p className="mt-0.5 font-medium">{current.title}</p>
              {currentProgress !== null && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-1.5 rounded-full bg-brand-500"
                    style={{ width: `${Math.min(100, Math.max(0, currentProgress))}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {next && (
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t("executive.todaySchedule.next")}
              </p>
              <p className="mt-0.5 font-medium">
                {next.startTime} {next.title}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
