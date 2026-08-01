import { HeartPulse } from "lucide-react";
import CircularScoreGauge from "@/components/ui/CircularScoreGauge";
import ProgressBar from "@/components/ui/ProgressBar";
import HealthScoreRadarChart from "@/features/finance/aiAnalytics/components/financialHealthScore/HealthScoreRadarChart";
import TrendComparisonChart from "@/features/finance/aiAnalytics/components/financialHealthScore/TrendComparisonChart";
import { useTranslation } from "@/i18n/useTranslation";
import type { FinancialHealthScoreResult, ScoreMessage, ScoreTrendPoint } from "@/features/finance/aiAnalytics/engine/scoring/types";

interface Props {
  result: FinancialHealthScoreResult;
  trendPoints: ScoreTrendPoint[];
}

function barColorClass(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function strokeColorClass(score: number): string {
  if (score >= 70) return "stroke-green-500";
  if (score >= 40) return "stroke-amber-500";
  return "stroke-red-500";
}

function badgeColorClass(score: number): string {
  if (score >= 70) return "bg-green-500/15 text-green-600 dark:text-green-400";
  if (score >= 40) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-red-500/15 text-red-600 dark:text-red-400";
}

function MessageList({ titleKey, messages }: { titleKey: string; messages: ScoreMessage[] }) {
  const { t } = useTranslation();
  if (messages.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t(titleKey)}</h3>
      <ul className="space-y-1">
        {messages.map((m, i) => (
          <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400">
            • {t(m.key, m.params)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FinancialHealthScoreSection({ result, trendPoints }: Props) {
  const { t } = useTranslation();
  const overallScore = result.overallScore;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HeartPulse size={20} className="text-rose-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.financialHealthScore.title")}</h2>
      </div>

      <div className="space-y-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        {result.insufficientData || overallScore === null ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.financialHealthScore.insufficientData")}</p>
        ) : (
          <>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <CircularScoreGauge score={overallScore} label={t("aiAnalytics.financialHealthScore.scoreLabel")} colorClass={strokeColorClass(overallScore)} />
                {result.grade && result.status && (
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badgeColorClass(overallScore)}`}>
                    {result.grade} — {t(`aiAnalytics.financialHealthScore.statuses.${result.status}`)}
                  </span>
                )}
              </div>

              <div className="w-full min-w-0">
                <HealthScoreRadarChart categoryScores={result.categoryScores} />
              </div>
            </div>

            <div className="space-y-3">
              {result.categoryScores.map((c) => (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">{t(`aiAnalytics.financialHealthScore.categories.${c.category}`)}</span>
                  <div className="flex-1">
                    <ProgressBar percentage={c.score ?? 0} colorClass={c.score === null ? "bg-zinc-300 dark:bg-zinc-700" : barColorClass(c.score)} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm text-zinc-500 dark:text-zinc-400">
                    {c.score === null ? t("aiAnalytics.healthScore.notApplicable") : Math.round(c.score)}
                  </span>
                </div>
              ))}
            </div>

            <TrendComparisonChart points={trendPoints} />

            <div className="grid gap-4 sm:grid-cols-2">
              <MessageList titleKey="aiAnalytics.financialHealthScore.sections.strengths" messages={result.strengths} />
              <MessageList titleKey="aiAnalytics.financialHealthScore.sections.weaknesses" messages={result.weaknesses} />
              <MessageList titleKey="aiAnalytics.financialHealthScore.sections.warnings" messages={result.warnings} />
              <MessageList titleKey="aiAnalytics.financialHealthScore.sections.recommendations" messages={result.recommendations} />
              <MessageList titleKey="aiAnalytics.financialHealthScore.sections.improvementOpportunities" messages={result.improvementOpportunities} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
