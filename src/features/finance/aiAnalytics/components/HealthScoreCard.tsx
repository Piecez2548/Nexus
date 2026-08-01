import { HeartPulse } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import { useTranslation } from "@/i18n/useTranslation";
import type { HealthScoreResult, HealthScoreKey } from "@/features/finance/aiAnalytics/engine/analyzers/healthScore";

interface Props {
  result: HealthScoreResult;
}

const SUB_SCORE_ORDER: HealthScoreKey[] = ["savingRate", "expenseRatio", "budgetControl", "budgetUsage", "incomeStability", "cashFlow"];

function scoreColorClass(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function scoreTextColorClass(score: number): string {
  if (score >= 70) return "text-green-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

export default function HealthScoreCard({ result }: Props) {
  const { t } = useTranslation();
  const subScoreByKey = new Map(result.subScores.map((s) => [s.key, s]));

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-5 flex items-center gap-2">
        <HeartPulse size={20} className="text-rose-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.healthScore.title")}</h2>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center">
          <span className={`text-5xl font-bold ${result.score === null ? "text-zinc-400 dark:text-zinc-600" : scoreTextColorClass(result.score)}`}>
            {result.score === null ? "—" : Math.round(result.score)}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.healthScore.scoreLabel")}</span>
          {result.grade !== null && (
            <span className={`mt-1 rounded-full px-2 py-0.5 text-xs font-semibold ${scoreTextColorClass(result.score!)}`}>
              {t(`aiAnalytics.healthScore.grades.${result.grade}`)}
            </span>
          )}
        </div>

        <div className="w-full space-y-3">
          {result.insufficientData && (
            <p className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              {t("aiAnalytics.healthScore.insufficientData")}
            </p>
          )}

          {SUB_SCORE_ORDER.map((key) => {
            const subScore = subScoreByKey.get(key);
            const score = subScore?.score ?? null;

            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">{t(`aiAnalytics.healthScore.subScores.${key}`)}</span>
                <div className="flex-1">
                  <ProgressBar percentage={score ?? 0} colorClass={score === null ? "bg-zinc-300 dark:bg-zinc-700" : scoreColorClass(score)} />
                </div>
                <span className="w-10 shrink-0 text-right text-sm text-zinc-500 dark:text-zinc-400">
                  {score === null ? t("aiAnalytics.healthScore.notApplicable") : Math.round(score)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
