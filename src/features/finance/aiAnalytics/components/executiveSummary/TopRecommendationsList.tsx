import { Lightbulb } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";
import type { RecommendationPriority } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

interface Props {
  recommendations: ActionableRecommendation[];
}

// No existing component renders ActionableRecommendation[] (confirmed —
// RecommendationsSection.tsx renders the older, tier-confidence
// Recommendation[] instead) — this is a genuinely new renderer, adapting
// that section's badge/title/reason/savings layout to the newer fields.
// priority is the exact same RecommendationPriority type, so its badge
// colors and i18n labels are reused verbatim (kept local, not exported,
// to avoid the fast-refresh lint warning already hit once this session
// when a badge-class map was co-exported with a component).
const PRIORITY_BADGE_CLASS: Record<RecommendationPriority, string> = {
  critical: "bg-red-600/20 text-red-600 dark:text-red-400",
  high: "bg-red-500/15 text-red-500",
  medium: "bg-amber-500/15 text-amber-500",
  low: "bg-zinc-500/15 text-zinc-500",
  information: "bg-blue-500/15 text-blue-500",
};

export default function TopRecommendationsList({ recommendations }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb size={18} className="text-yellow-500" />
        <h3 className="text-sm font-semibold">{t("aiAnalytics.executiveSummaryReport.topRecommendations.title")}</h3>
      </div>

      {recommendations.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.executiveSummaryReport.topRecommendations.empty")}</p>
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
              </div>
              <div className="shrink-0 text-right">
                {rec.estimatedMonthlySavings > 0 && (
                  <span className="block text-sm font-semibold text-green-500">
                    {t("aiAnalytics.recommendations.estimatedSavings", { amount: rec.estimatedMonthlySavings.toLocaleString() })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
