import { AlertTriangle } from "lucide-react";

import { useRiskConfigStore } from "@/features/trading/store/riskConfigStore";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

// Empty input -> no limit set (null), not 0 -- 0 would mean "alert on any
// loss at all," a materially different, much stricter setting. A negative
// number is not a meaningful loss threshold, so it's rejected the same way
// as non-numeric input: the field just doesn't update.
function parseLimit(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

interface Props {
  todayPnl: number;
  weeklyPnl: number;
}

export default function RiskLimitPanel({ todayPnl, weeklyPnl }: Props) {
  const { maxDailyLossLimit, maxWeeklyLossLimit, setMaxDailyLossLimit, setMaxWeeklyLossLimit } = useRiskConfigStore();
  const { t } = useTranslation();

  // A "breach" is a realized loss (negative P/L) whose magnitude reaches the
  // configured limit -- a positive or break-even P/L never triggers this,
  // no matter how the limit is set.
  const dailyBreached = maxDailyLossLimit !== null && todayPnl < 0 && Math.abs(todayPnl) >= maxDailyLossLimit;
  const weeklyBreached = maxWeeklyLossLimit !== null && weeklyPnl < 0 && Math.abs(weeklyPnl) >= maxWeeklyLossLimit;

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t("trading.riskLimitTitle")}</h2>

      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("trading.riskLimitMaxDaily")} htmlFor="risk-limit-daily">
          <input
            id="risk-limit-daily"
            type="number"
            min={0}
            step="any"
            value={maxDailyLossLimit ?? ""}
            onChange={(e) => setMaxDailyLossLimit(parseLimit(e.target.value))}
            placeholder={t("trading.riskLimitNoLimit")}
            className={inputClassName}
          />
        </FormField>

        <FormField label={t("trading.riskLimitMaxWeekly")} htmlFor="risk-limit-weekly">
          <input
            id="risk-limit-weekly"
            type="number"
            min={0}
            step="any"
            value={maxWeeklyLossLimit ?? ""}
            onChange={(e) => setMaxWeeklyLossLimit(parseLimit(e.target.value))}
            placeholder={t("trading.riskLimitNoLimit")}
            className={inputClassName}
          />
        </FormField>
      </div>

      {(dailyBreached || weeklyBreached) && (
        <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            {dailyBreached && (
              <p>
                {t("trading.riskLimitDailyBreached", {
                  loss: Math.abs(todayPnl).toLocaleString(),
                  limit: maxDailyLossLimit!.toLocaleString(),
                })}
              </p>
            )}
            {weeklyBreached && (
              <p>
                {t("trading.riskLimitWeeklyBreached", {
                  loss: Math.abs(weeklyPnl).toLocaleString(),
                  limit: maxWeeklyLossLimit!.toLocaleString(),
                })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
