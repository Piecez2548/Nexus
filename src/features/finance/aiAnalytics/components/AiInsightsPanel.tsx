import { Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import type { AiInsight } from "@/features/finance/aiAnalytics/engine/analyzers/insights";

interface Props {
  insights: AiInsight[];
}

// spendingTrend/savingsTrend carry a `direction` param ("up"/"down") — kept
// as structured data by the engine, resolved to a translated message
// *variant* here rather than interpolating the raw English word into
// otherwise-localized text.
function messageKey(insight: AiInsight): string {
  if (insight.key === "spendingTrend" || insight.key === "savingsTrend") {
    return `aiAnalytics.insights.${insight.key}${insight.params.direction === "up" ? "Up" : "Down"}`;
  }
  return `aiAnalytics.insights.${insight.key}`;
}

export default function AiInsightsPanel({ insights }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={20} className="text-amber-400" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.insights.title")}</h2>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.insights.empty")}</p>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`rounded-xl border px-4 py-3 text-sm ${
                insight.severity === "warning"
                  ? "border-amber-900/40 bg-amber-950/20 text-amber-300"
                  : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300"
              }`}
            >
              {t(messageKey(insight), insight.params)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
