import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { SEVERITY_BADGE_CLASS } from "@/features/finance/aiAnalytics/constants/forecastAlertSeverity";
import type { ForecastAlert } from "@/features/finance/aiAnalytics/engine/forecast/types";

interface Props {
  alerts: ForecastAlert[];
}

export default function ForecastAlertsList({ alerts }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-500" />
        <h3 className="text-sm font-semibold">{t("aiAnalytics.forecast.alerts.title")}</h3>
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.alerts.empty")}</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-sm">{t(alert.message.key, alert.message.params)}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_BADGE_CLASS[alert.severity]}`}>
                {t(`aiAnalytics.forecast.alerts.severity.${alert.severity}`)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
