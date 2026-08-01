import { useMemo } from "react";
import { useTradingAnalytics } from "@/features/trading/hooks/useTradingAnalytics";
import { useTranslation } from "@/i18n/useTranslation";

const WEEKDAY_KEYS = [
  "aiAnalytics.weekdays.sun",
  "aiAnalytics.weekdays.mon",
  "aiAnalytics.weekdays.tue",
  "aiAnalytics.weekdays.wed",
  "aiAnalytics.weekdays.thu",
  "aiAnalytics.weekdays.fri",
  "aiAnalytics.weekdays.sat",
];

function intensityClass(pnl: number, maxAbs: number): string {
  const ratio = Math.min(1, Math.abs(pnl) / (maxAbs || 1));

  if (pnl > 0) {
    if (ratio > 0.66) return "bg-green-600 text-white";
    if (ratio > 0.33) return "bg-green-500/50";
    return "bg-green-500/20";
  }

  if (ratio > 0.66) return "bg-red-600 text-white";
  if (ratio > 0.33) return "bg-red-500/50";
  return "bg-red-500/20";
}

export default function PerformanceCalendar() {
  const { dailyPnl } = useTradingAnalytics();
  const { t, language } = useTranslation();

  const { monthLabel, cells, maxAbs } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const pnlByDate = new Map(dailyPnl.map((d) => [d.date, d.pnl]));

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = new Date(year, month, 1).getDay();

    const cells: { day: number | null; pnl: number | null }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ day: null, pnl: null });

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, pnl: pnlByDate.get(dateStr) ?? null });
    }

    const maxAbs = Math.max(1, ...dailyPnl.map((d) => Math.abs(d.pnl)));
    const monthLabel = new Date(year, month, 1).toLocaleDateString(language === "th" ? "th-TH" : "en-US", {
      month: "long",
      year: "numeric",
    });

    return { monthLabel, cells, maxAbs };
  }, [dailyPnl, language]);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="mb-1 text-lg font-semibold">{t("trading.performanceCalendar")}</h2>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{monthLabel}</p>

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {WEEKDAY_KEYS.map((key) => (
          <div key={key}>{t(key)}</div>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((cell, index) => (
          <div
            key={index}
            className={`flex h-12 flex-col items-center justify-center rounded-lg text-xs ${
              cell.day === null
                ? ""
                : cell.pnl === null
                  ? "bg-zinc-50 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600"
                  : intensityClass(cell.pnl, maxAbs)
            }`}
          >
            {cell.day !== null && (
              <>
                <span>{cell.day}</span>
                {cell.pnl !== null && (
                  <span className="text-[10px]">
                    {cell.pnl >= 0 ? "+" : ""}
                    {Math.round(cell.pnl)}
                  </span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
