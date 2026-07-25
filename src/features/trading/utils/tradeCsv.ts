import { rowsToCsv } from "@/utils/csv";
import { calculatePnl, calculateRR, calculateResult } from "@/features/trading/utils/pnl";
import { MARKET_LABELS, DIRECTION_LABELS, EMOTION_LABELS, RESULT_LABELS } from "@/features/trading/constants/labels";
import type { Trade } from "@/features/trading/types";

const HEADERS = [
  "date",
  "symbol",
  "market",
  "direction",
  "lot",
  "entry",
  "exit",
  "pnl",
  "risk",
  "rr",
  "strategy",
  "emotion",
  "result",
];

// A leading apostrophe tells Excel's CSV import to keep the field as literal
// text instead of auto-converting it to a date serial number — without it,
// a plain "2026-07-21" often renders as "#####" once Excel reflows the
// column to its own date format.
function forceTextForExcel(value: string): string {
  return `'${value}`;
}

export function tradesToCsv(trades: Trade[]): string {
  const rows = trades.map((t) => {
    const pnl = calculatePnl(t);
    const rr = calculateRR(t);

    return [
      forceTextForExcel(t.entryDate),
      t.symbol,
      MARKET_LABELS[t.market],
      DIRECTION_LABELS[t.direction],
      String(t.quantity),
      String(t.entryPrice),
      t.exitPrice !== undefined ? String(t.exitPrice) : "",
      pnl !== null ? pnl.toFixed(2) : "",
      t.riskPercent !== undefined ? `${t.riskPercent}%` : "",
      rr !== null ? rr.toFixed(2) : "",
      t.strategy ?? "",
      t.emotionBefore ? EMOTION_LABELS[t.emotionBefore] : "",
      RESULT_LABELS[calculateResult(t)],
    ];
  });

  return rowsToCsv([HEADERS, ...rows]);
}
