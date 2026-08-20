import { rowsToCsv } from "@/utils/csv";
import { calculatePnl, calculateRR, calculateResult } from "@/features/trading/utils/pnl";
import { getMarketLabels, getDirectionLabels, getEmotionLabels, getResultLabels } from "@/features/trading/constants/labels";
import { translate } from "@/i18n/useTranslation";
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
  const marketLabels = getMarketLabels(translate);
  const directionLabels = getDirectionLabels(translate);
  const emotionLabels = getEmotionLabels(translate);
  const resultLabels = getResultLabels(translate);

  const rows = trades.map((t) => {
    const pnl = calculatePnl(t);
    const rr = calculateRR(t);

    return [
      forceTextForExcel(t.entryDate),
      t.symbol,
      marketLabels[t.market],
      directionLabels[t.direction],
      String(t.quantity),
      String(t.entryPrice),
      t.exitPrice !== undefined ? String(t.exitPrice) : "",
      pnl !== null ? pnl.toFixed(2) : "",
      t.riskPercent !== undefined ? `${t.riskPercent}%` : "",
      rr !== null ? rr.toFixed(2) : "",
      t.strategy ?? "",
      t.emotionBefore ? emotionLabels[t.emotionBefore] : "",
      resultLabels[calculateResult(t)],
    ];
  });

  return rowsToCsv([HEADERS, ...rows]);
}
