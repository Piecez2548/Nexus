import { useState } from "react";
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import type { RecommendationPriority } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { ActionableRecommendation, Difficulty } from "@/features/finance/aiAnalytics/engine/recommendation/types";

interface Props {
  recommendations: ActionableRecommendation[];
}

const PRIORITY_BADGE_CLASS: Record<RecommendationPriority, string> = {
  critical: "bg-red-600/20 text-red-600 dark:text-red-400",
  high: "bg-red-500/15 text-red-500",
  medium: "bg-amber-500/15 text-amber-500",
  low: "bg-zinc-500/15 text-zinc-500",
  information: "bg-blue-500/15 text-blue-500",
};

const DIFFICULTY_BADGE_CLASS: Record<Difficulty, string> = {
  easy: "bg-green-500/15 text-green-600 dark:text-green-400",
  moderate: "bg-amber-500/15 text-amber-500",
  hard: "bg-red-500/15 text-red-500",
};

const ACTION_BUCKETS = [
  { key: "immediate", labelKey: "aiAnalytics.executiveSummaryReport.actionPlan.immediate" },
  { key: "weekly", labelKey: "aiAnalytics.executiveSummaryReport.actionPlan.weekly" },
  { key: "monthly", labelKey: "aiAnalytics.executiveSummaryReport.actionPlan.monthly" },
  { key: "longTerm", labelKey: "aiAnalytics.executiveSummaryReport.actionPlan.longTerm" },
] as const;

function RecommendationCard({ rec }: { rec: ActionableRecommendation }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const impact = rec.estimatedFinancialImpact;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_BADGE_CLASS[rec.priority]}`}>
              {t(`aiAnalytics.recommendations.priority.${rec.priority}`)}
            </span>
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${DIFFICULTY_BADGE_CLASS[rec.difficulty]}`}>
              {t(`aiAnalytics.actionableRecommendations.difficulty.${rec.difficulty}`)}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-600">
              {t(`aiAnalytics.actionableRecommendations.expectedCompletionTime.${rec.expectedCompletionTime}`)}
            </span>
          </div>
          <p className="text-sm font-medium">{t(rec.title.key, rec.title.params)}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t(rec.reason.key, rec.reason.params)}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t(rec.description.key, rec.description.params)}</p>
        </div>

        <div className="shrink-0 text-right">
          {rec.estimatedMonthlySavings > 0 && (
            <span className="block text-sm font-semibold text-green-500">
              {t("aiAnalytics.recommendations.estimatedSavings", { amount: rec.estimatedMonthlySavings.toLocaleString() })}
            </span>
          )}
          {rec.estimatedAnnualSavings > 0 && (
            <span className="block text-xs text-green-600/80 dark:text-green-400/80">
              {t("aiAnalytics.actionableRecommendations.annualSavings", { amount: rec.estimatedAnnualSavings.toLocaleString() })}
            </span>
          )}
          {impact.budgetImprovementPercent !== null && (
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              {t("aiAnalytics.actionableRecommendations.budgetImprovement", { percent: impact.budgetImprovementPercent })}
            </span>
          )}
          {impact.savingRateImprovementPercent !== null && (
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              {t("aiAnalytics.actionableRecommendations.savingRateImprovement", { percent: impact.savingRateImprovementPercent })}
            </span>
          )}
          <span className="mt-1 inline-block text-xs text-zinc-400 dark:text-zinc-600">
            {t("aiAnalytics.actionableRecommendations.confidencePercent", { value: rec.confidence })}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400"
      >
        {t("aiAnalytics.executiveSummaryReport.actionPlan.title")}
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="mt-2 grid gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-2 sm:grid-cols-2">
          {ACTION_BUCKETS.map((bucket) => {
            const message = rec.suggestedActions[bucket.key];
            return (
              <div key={bucket.key}>
                <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{t(bucket.labelKey)}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t(message.key, message.params)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
