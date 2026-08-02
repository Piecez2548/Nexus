import { Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { HEADLINE_COLOR_CLASS } from "@/features/finance/aiAnalytics/constants/executiveSummaryHeadline";
import OverallAssessmentCard from "@/features/finance/aiAnalytics/components/executiveSummary/OverallAssessmentCard";
import BehaviorSummaryCard from "@/features/finance/aiAnalytics/components/executiveSummary/BehaviorSummaryCard";
import ForecastSummaryCard from "@/features/finance/aiAnalytics/components/executiveSummary/ForecastSummaryCard";
import RiskSummaryList from "@/features/finance/aiAnalytics/components/executiveSummary/RiskSummaryList";
import ActionPlanPanel from "@/features/finance/aiAnalytics/components/executiveSummary/ActionPlanPanel";
import TopRecommendationsList from "@/features/finance/aiAnalytics/components/executiveSummary/TopRecommendationsList";
import type { ExecutiveSummaryReport } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

interface Props {
  result: ExecutiveSummaryReport;
}

export default function ExecutiveSummarySection({ result }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={20} className="text-violet-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.executiveSummaryReport.title")}</h2>
        <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {t("aiAnalytics.executiveSummaryReport.confidence", { value: result.confidence })}
        </span>
      </div>

      <div className={`rounded-2xl border p-6 ${HEADLINE_COLOR_CLASS[result.headline.key]}`}>
        <p className="text-lg font-semibold">{t(result.headline.message.key, result.headline.message.params)}</p>
      </div>

      {result.highlights.entries.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t("aiAnalytics.executiveSummaryReport.highlightsTitle")}</h3>
          <ul className="space-y-1.5">
            {result.highlights.entries.map((entry) => (
              <li key={entry.type} className="text-sm text-zinc-600 dark:text-zinc-400">
                ✦ {t(entry.message.key, entry.message.params)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <OverallAssessmentCard result={result.overallSummary} />

      <BehaviorSummaryCard result={result.behaviorSummary} />

      <ForecastSummaryCard result={result.forecastSummary} />

      <RiskSummaryList result={result.riskSummary} />

      <ActionPlanPanel result={result.actionPlan} />

      <TopRecommendationsList recommendations={result.topRecommendations} />
    </div>
  );
}
