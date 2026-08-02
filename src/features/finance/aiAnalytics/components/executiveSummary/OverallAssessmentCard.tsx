import { HeartPulse } from "lucide-react";
import CircularScoreGauge from "@/components/ui/CircularScoreGauge";
import { useTranslation } from "@/i18n/useTranslation";
import type { OverallAssessment } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";
import type { ScoreMessage } from "@/features/finance/aiAnalytics/engine/scoring/types";

interface Props {
  result: OverallAssessment;
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

// Mirrors financialHealthScore/FinancialHealthScoreSection.tsx's own
// MessageList — topStrengths/topWeaknesses are literally
// financialHealthScore.strengths/weaknesses.slice(0,3), the exact same
// ScoreMessage[] type, so the same rendering + i18n section labels apply.
function MessageList({ titleKey, messages }: { titleKey: string; messages: ScoreMessage[] }) {
  const { t } = useTranslation();
  if (messages.length === 0) return null;

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t(titleKey)}</h4>
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

export default function OverallAssessmentCard({ result }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <HeartPulse size={18} className="text-rose-500" />
        <h3 className="text-sm font-semibold">{t("aiAnalytics.executiveSummaryReport.overallSummary.title")}</h3>
      </div>

      {result.insufficientData || result.overallScore === null ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.financialHealthScore.insufficientData")}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
            <CircularScoreGauge score={result.overallScore} size={100} strokeWidth={9} colorClass={strokeColorClass(result.overallScore)} />
            {result.grade && result.status && (
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badgeColorClass(result.overallScore)}`}>
                {result.grade} — {t(`aiAnalytics.financialHealthScore.statuses.${result.status}`)}
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MessageList titleKey="aiAnalytics.financialHealthScore.sections.strengths" messages={result.topStrengths} />
            <MessageList titleKey="aiAnalytics.financialHealthScore.sections.weaknesses" messages={result.topWeaknesses} />
          </div>
        </div>
      )}
    </div>
  );
}
