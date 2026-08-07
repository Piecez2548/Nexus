import { useMemo } from "react";
import ChartFigure from "@/features/finance/aiAnalytics/components/ChartFigure";
import { useTranslation } from "@/i18n/useTranslation";
import type { HourWeekdayCell, TimeAnalysisResult } from "@/features/finance/aiAnalytics/engine/behavior/types";

// A 7x24 weekday x hour intensity grid, using timeAnalyzer.ts's
// byHourWeekday breakdown. Color-scaling adapted from
// trading/components/PerformanceCalendar.tsx's intensityClass() — single
// hue here since this is a spending-intensity scale, not P&L.
const WEEKDAY_KEYS = ["aiAnalytics.weekdays.sun", "aiAnalytics.weekdays.mon", "aiAnalytics.weekdays.tue", "aiAnalytics.weekdays.wed", "aiAnalytics.weekdays.thu", "aiAnalytics.weekdays.fri", "aiAnalytics.weekdays.sat"];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function intensityClass(amount: number, maxAmount: number): string {
  if (amount <= 0) return "bg-zinc-100 dark:bg-zinc-800/60";
  const ratio = Math.min(1, amount / (maxAmount || 1));
  if (ratio > 0.66) return "bg-violet-600";
  if (ratio > 0.33) return "bg-violet-500/60";
  return "bg-violet-500/25";
}

interface Props {
  timeAnalysis: TimeAnalysisResult;
}

export default function BehaviorHeatmap({ timeAnalysis }: Props) {
  const { t } = useTranslation();

  const { grid, maxAmount } = useMemo(() => {
    const byKey = new Map(timeAnalysis.byHourWeekday.map((cell) => [`${cell.weekday}-${cell.hour}`, cell]));
    const maxAmount = Math.max(1, ...timeAnalysis.byHourWeekday.map((cell) => cell.totalAmount));
    const grid: HourWeekdayCell[][] = Array.from({ length: 7 }, (_, weekday) =>
      HOURS.map((hour) => byKey.get(`${weekday}-${hour}`) ?? { weekday, hour, totalAmount: 0, transactionCount: 0 })
    );
    return { grid, maxAmount };
  }, [timeAnalysis.byHourWeekday]);

  if (timeAnalysis.dataQuality === "unavailable") {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.behaviorProfile.charts.heatmap.unavailable")}</p>;
  }

  return (
    <ChartFigure label={t("aiAnalytics.charts.heatmap")}>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          {grid.map((row, weekday) => (
            <div key={weekday} className="flex items-center gap-1">
              <span className="w-8 shrink-0 text-[10px] text-zinc-500 dark:text-zinc-400">{t(WEEKDAY_KEYS[weekday])}</span>
              {row.map((cell) => (
                <div key={cell.hour} title={`${cell.hour}:00 — ฿${cell.totalAmount.toFixed(0)}`} className={`h-4 w-4 rounded-sm ${intensityClass(cell.totalAmount, maxAmount)}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </ChartFigure>
  );
}
