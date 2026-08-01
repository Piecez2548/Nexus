import { Lightbulb } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import type { Recommendation, RecommendationPriority } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

interface Props {
  recommendations: Recommendation[];
}

const PRIORITY_BADGE_CLASS: Record<RecommendationPriority, string> = {
  critical: "bg-red-600/20 text-red-600 dark:text-red-400",
  high: "bg-red-500/15 text-red-500",
  medium: "bg-amber-500/15 text-amber-500",
  low: "bg-zinc-500/15 text-zinc-500",
  information: "bg-blue-500/15 text-blue-500",
};

export default function RecommendationsSection({ recommendations }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb size={20} className="text-yellow-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.recommendations.title")}</h2>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        {recommendations.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.recommendations.empty")}</p>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
                <div>
                  <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_BADGE_CLASS[rec.priority]}`}>
                    {t(`aiAnalytics.recommendations.priority.${rec.priority}`)}
                  </span>
                  <p className="text-sm font-medium">{t(rec.title.key, rec.title.params)}</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t(rec.reason.key, rec.reason.params)}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t(rec.action.key, rec.action.params)}</p>
                </div>
                <div className="shrink-0 text-right">
                  {/* Informational/positive rules deliberately carry a 0
                      estimatedMonthlySavings — "the ask" here isn't a
                      spending cut, so there's no ฿ figure to show. */}
                  {rec.estimatedMonthlySavings > 0 && (
                    <span className="block text-sm font-semibold text-green-500">
                      {t("aiAnalytics.recommendations.estimatedSavings", { amount: rec.estimatedMonthlySavings.toLocaleString() })}
                    </span>
                  )}
                  {rec.estimatedMonthlySavings > 0 && rec.estimatedImpact !== null && (
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {t("aiAnalytics.recommendations.estimatedImpact", { percent: rec.estimatedImpact })}
                    </span>
                  )}
                  <span className="mt-1 inline-block text-xs text-zinc-400 dark:text-zinc-600">{t(`aiAnalytics.recommendations.confidence.${rec.confidence}`)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
