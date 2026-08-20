import type { ReactNode } from "react";
import { Image } from "lucide-react";

import { calculatePnl, calculateResult, calculateHoldingMinutes } from "@/features/trading/utils/pnl";
import { getMarketLabels, getDirectionLabels, getEmotionLabels, getResultLabels } from "@/features/trading/constants/labels";
import { useTranslation } from "@/i18n/useTranslation";
import type { Trade } from "@/features/trading/types";

interface Props {
  trade: Trade;
}

const RESULT_BADGE_CLASS: Record<string, string> = {
  open: "bg-brand-500/15 text-brand-400",
  win: "bg-green-500/15 text-green-400",
  loss: "bg-red-500/15 text-red-400",
  unknown: "bg-zinc-200/60 dark:bg-zinc-700/40 text-zinc-700 dark:text-zinc-300",
};

function formatHoldingTime(minutes: number | null): string {
  if (minutes === null) return "—";
  const total = Math.round(minutes);
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-500">{title}</h3>
      {children}
    </div>
  );
}

// Read-only step-by-step retelling of a trade's own recorded lifecycle --
// no external chart/price-history data, only fields the user already
// entered on the trade itself (this app has no live/historical price feed).
export default function TradeReplayView({ trade }: Props) {
  const { t } = useTranslation();
  const marketLabels = getMarketLabels(t);
  const directionLabels = getDirectionLabels(t);
  const emotionLabels = getEmotionLabels(t);
  const resultLabels = getResultLabels(t);

  const pnl = calculatePnl(trade);
  const result = calculateResult(trade);
  const holdingMinutes = calculateHoldingMinutes(trade);

  const hasReflection =
    trade.emotionAfter !== undefined ||
    trade.confidenceAfter !== undefined ||
    !!trade.mistakes ||
    !!trade.lessonsLearned ||
    !!trade.notes ||
    (trade.screenshots?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{trade.symbol}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("trading.replayTitle")}</p>
      </div>

      <Step title={t("trading.replayEntry")}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("common.date")} value={`${trade.entryDate}${trade.entryTime ? ` ${trade.entryTime}` : ""}`} />
          <Field label={t("trading.entryPrice")} value={trade.entryPrice} />
          <Field label={t("trading.direction")} value={directionLabels[trade.direction]} />
          <Field label={t("trading.market")} value={marketLabels[trade.market]} />
          {trade.emotionBefore && <Field label={t("trading.emotionLabel")} value={emotionLabels[trade.emotionBefore]} />}
          {trade.confidenceBefore !== undefined && (
            <Field label={t("trading.confidenceLabel")} value={trade.confidenceBefore} />
          )}
        </div>
      </Step>

      <Step title={t("trading.replayPosition")}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("trading.stopLossLabel")} value={trade.stopLoss ?? "—"} />
          <Field label={t("trading.takeProfitLabel")} value={trade.takeProfit ?? "—"} />
          {trade.riskPercent !== undefined && <Field label={t("trading.riskPercent")} value={`${trade.riskPercent}%`} />}
          {trade.positionSize !== undefined && <Field label={t("trading.positionSizeLabel")} value={trade.positionSize} />}
          <Field label={t("trading.averageHoldingTime")} value={formatHoldingTime(holdingMinutes)} />
        </div>
      </Step>

      <Step title={t("trading.replayExit")}>
        {trade.status === "open" ? (
          <p className="text-zinc-500 dark:text-zinc-400">{t("trading.replayStillOpen")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field
              label={t("common.date")}
              value={`${trade.exitDate ?? "—"}${trade.exitTime ? ` ${trade.exitTime}` : ""}`}
            />
            <Field label={t("trading.exitPrice")} value={trade.exitPrice ?? "—"} />
            <Field
              label={t("trading.pnl")}
              value={
                <span className={pnl === null ? "" : pnl >= 0 ? "text-green-400" : "text-red-400"}>
                  {pnl === null ? "—" : pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              }
            />
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t("trading.result")}</p>
              <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${RESULT_BADGE_CLASS[result]}`}>
                {resultLabels[result]}
              </span>
            </div>
          </div>
        )}
      </Step>

      <Step title={t("trading.replayReflection")}>
        {!hasReflection ? (
          <p className="text-zinc-500 dark:text-zinc-400">{t("trading.replayNoReflection")}</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {trade.emotionAfter && <Field label={t("trading.emotionLabel")} value={emotionLabels[trade.emotionAfter]} />}
              {trade.confidenceAfter !== undefined && (
                <Field label={t("trading.confidenceLabel")} value={trade.confidenceAfter} />
              )}
            </div>

            {trade.mistakes && <Field label={t("trading.mistakesLabel")} value={trade.mistakes} />}
            {trade.lessonsLearned && <Field label={t("trading.lessonsLabel")} value={trade.lessonsLearned} />}
            {trade.notes && <Field label={t("trading.notesLabel")} value={trade.notes} />}

            {trade.screenshots && trade.screenshots.length > 0 && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {t("trading.screenshotLabel")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {trade.screenshots.map((src, i) => (
                    <a
                      key={src}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t("trading.viewScreenshot", { symbol: trade.symbol })}
                      className="flex h-16 w-16 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 transition hover:text-brand-400"
                    >
                      <Image size={20} />
                      <span className="sr-only">{i + 1}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Step>
    </div>
  );
}
