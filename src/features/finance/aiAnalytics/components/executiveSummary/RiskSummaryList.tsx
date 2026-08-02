import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { SEVERITY_BADGE_CLASS } from "@/features/finance/aiAnalytics/constants/forecastAlertSeverity";
import type { RiskSummary } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

interface Props {
  result: RiskSummary;
}

// entry.severity is literally ForecastAlertSeverity (RiskEntry passes
// alert.severity through unmodified) — reuses the exact severity badge map
// and i18n labels already built for the Forecast section's own alerts list.
export default function RiskSummaryList({ result }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-500" />
        <h3 className="text-sm font-semibold">{t("aiAnalytics.executiveSummaryReport.riskSummary.title")}</h3>
      </div>

      {result.entries.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.executiveSummaryReport.riskSummary.empty")}</p>
      ) : (
        <div className="space-y-2">
          {result.entries.map((entry) => (
            <div key={entry.sourceAlertId} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-sm">{t(entry.message.key, entry.message.params)}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_BADGE_CLASS[entry.severity]}`}>
                {t(`aiAnalytics.forecast.alerts.severity.${entry.severity}`)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
