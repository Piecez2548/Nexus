import { useMemo } from "react";
import ChartFigure from "@/features/finance/aiAnalytics/components/ChartFigure";
import { useTranslation } from "@/i18n/useTranslation";
import type { DailyTrendPoint } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";

// Structural reuse of trading/components/PerformanceCalendar.tsx's month
// grid (7-col CSS grid, blank leading cells for the month's start weekday)
// — adapted from P&L intensity to spending intensity. Reuses
// spendingAnalysis.dailyTrend (already computed for the whole month)
// rather than a new narrowly-scoped "discretionary-only" daily breakdown —
// a general daily-spending view is itself informative for a habit
// calendar, and this way the engine doesn't need a new field just for it.
const WEEKDAY_KEYS = ["aiAnalytics.weekdays.sun", "aiAnalytics.weekdays.mon", "aiAnalytics.weekdays.tue", "aiAnalytics.weekdays.wed", "aiAnalytics.weekdays.thu", "aiAnalytics.weekdays.fri", "aiAnalytics.weekdays.sat"];

function intensityClass(amount: number, maxAmount: number): string {
  if (amount <= 0) return "";
  const ratio = Math.min(1, amount / (maxAmount || 1));
  if (ratio > 0.66) return "bg-amber-600 text-white";
  if (ratio > 0.33) return "bg-amber-500/50";
  return "bg-amber-500/20";
}

interface Props {
  dailyTrend: DailyTrendPoint[];
  now: Date;
}

export default function HabitCalendar({ dailyTrend, now }: Props) {
  const { t, language } = useTranslation();

  const { monthLabel, cells, maxAmount } = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const amountByDate = new Map(dailyTrend.map((d) => [d.date, d.amount]));

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = new Date(year, month, 1).getDay();

    const cells: { day: number | null; amount: number | null }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ day: null, amount: null });
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, amount: amountByDate.get(dateStr) ?? 0 });
    }

    const maxAmount = Math.max(1, ...dailyTrend.map((d) => d.amount));
    const monthLabel = new Date(year, month, 1).toLocaleDateString(language === "th" ? "th-TH" : "en-US", { month: "long", year: "numeric" });

    return { monthLabel, cells, maxAmount };
  }, [dailyTrend, now, language]);

  return (
    <ChartFigure label={t("aiAnalytics.charts.habitCalendar", { month: monthLabel })}>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">{monthLabel}</p>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-500 dark:text-zinc-400">
        {WEEKDAY_KEYS.map((key) => (
          <div key={key}>{t(key)}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, index) => (
          <div
            key={index}
            className={`flex h-9 items-center justify-center rounded text-[10px] ${cell.day === null ? "" : (cell.amount === null || cell.amount === 0) ? "bg-zinc-50 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600" : intensityClass(cell.amount, maxAmount)}`}
          >
            {cell.day}
          </div>
        ))}
      </div>
    </ChartFigure>
  );
}
