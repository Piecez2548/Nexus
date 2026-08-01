// Buckets the same `.time`-bearing transactions mostActiveHour already uses
// (behaviorAnalysis.ts) into 5 named time-of-day buckets, plus a 7x24
// weekday x hour grid for the Heatmap UI. Bucket boundaries deliberately
// align with nightSpending's own NIGHT_START_HOUR=22/NIGHT_END_HOUR=5, so
// "night"/"lateNight" here agree with the existing night-spending signal
// rather than picking fresh, inconsistent cutoffs. The 14-22 "dinner"
// bucket is intentionally generous (it absorbs the unnamed afternoon
// hours) since the spec names only 5 buckets, not 6.

import { lastNMonthRanges } from "@/features/finance/utils/cashFlowMath";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import { parseLocalDate } from "@/utils/localDate";
import type { Transaction } from "@/features/finance/types";
import type { BehaviorEngineContext, HourWeekdayCell, TimeAnalysisResult, TimeOfDayBucket } from "@/features/finance/aiAnalytics/engine/behavior/types";

const ANALYSIS_WINDOW_MONTHS = 3; // matches behaviorAnalysis.ts's own window for time-based signals
const THIN_TIME_COVERAGE_RATIO = 0.3; // matches mostActiveHour's own threshold
const ALL_BUCKETS: TimeOfDayBucket[] = ["morning", "lunch", "dinner", "night", "lateNight"];

function bucketForHour(hour: number): TimeOfDayBucket {
  if (hour < 5) return "lateNight";
  if (hour < 11) return "morning";
  if (hour < 14) return "lunch";
  if (hour < 22) return "dinner";
  return "night";
}

function windowRange(now: Date) {
  const months = lastNMonthRanges(ANALYSIS_WINDOW_MONTHS, now);
  return { start: months[0].range.start, end: months[months.length - 1].range.end };
}

export function analyzeTimeOfDay(context: BehaviorEngineContext): TimeAnalysisResult {
  const range = windowRange(context.now);
  const windowExpenses = context.transactions.filter((t: Transaction) => t.type === "expense" && isDateWithinRange(t.date, range));

  const withTime = windowExpenses.filter((t) => typeof t.time === "string" && t.time.length > 0);
  const coverage = windowExpenses.length > 0 ? withTime.length / windowExpenses.length : 0;
  const dataQuality: TimeAnalysisResult["dataQuality"] = withTime.length === 0 ? "unavailable" : coverage < THIN_TIME_COVERAGE_RATIO ? "thin" : "full";

  const byTimeOfDayMap = new Map<TimeOfDayBucket, { totalAmount: number; transactionCount: number }>(ALL_BUCKETS.map((b) => [b, { totalAmount: 0, transactionCount: 0 }]));

  const cells: HourWeekdayCell[] = [];
  const cellIndex = new Map<string, HourWeekdayCell>();
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      const cell: HourWeekdayCell = { weekday, hour, totalAmount: 0, transactionCount: 0 };
      cells.push(cell);
      cellIndex.set(`${weekday}-${hour}`, cell);
    }
  }

  for (const t of withTime) {
    const hour = Number(t.time!.split(":")[0]);
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;

    const bucketEntry = byTimeOfDayMap.get(bucketForHour(hour))!;
    bucketEntry.totalAmount += t.amount;
    bucketEntry.transactionCount += 1;

    const weekday = parseLocalDate(t.date).getDay();
    const cell = cellIndex.get(`${weekday}-${hour}`)!;
    cell.totalAmount += t.amount;
    cell.transactionCount += 1;
  }

  return {
    dataQuality,
    byTimeOfDay: ALL_BUCKETS.map((bucket) => ({ bucket, ...byTimeOfDayMap.get(bucket)! })),
    byHourWeekday: cells,
  };
}
