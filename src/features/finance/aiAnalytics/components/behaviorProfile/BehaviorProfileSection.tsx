import { Radar as RadarIcon } from "lucide-react";
import CircularScoreGauge from "@/components/ui/CircularScoreGauge";
import ChartCard from "@/components/ui/ChartCard";
import BehaviorRadarChart from "@/features/finance/aiAnalytics/components/behaviorProfile/BehaviorRadarChart";
import BehaviorHeatmap from "@/features/finance/aiAnalytics/components/behaviorProfile/BehaviorHeatmap";
import HabitCalendar from "@/features/finance/aiAnalytics/components/behaviorProfile/HabitCalendar";
import { useTranslation } from "@/i18n/useTranslation";
import type { BehaviorAnalysisEngineResult, BehaviorMessage, DetectedHabit } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { DailyTrendPoint } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";

// Composes the genuinely-new Prompt 007 outputs only — Merchant Ranking
// and Weekly Activity are already rendered elsewhere on this same page
// (MerchantAnalysisSection / SpendingAnalysisSection), so they're not
// duplicated here. Structurally mirrors financialHealthScore/
// FinancialHealthScoreSection.tsx: gauge+radar header, then a grid of
// MessageList buckets.
interface Props {
  result: BehaviorAnalysisEngineResult;
  dailyTrend: DailyTrendPoint[];
  now: Date;
}

function MessageList({ titleKey, messages }: { titleKey: string; messages: BehaviorMessage[] }) {
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

function habitMessages(habits: DetectedHabit[]): BehaviorMessage[] {
  return habits.map((h) => h.message);
}

export default function BehaviorProfileSection({ result, dailyTrend, now }: Props) {
  const { t } = useTranslation();
  const { spendingStyle, timeAnalysis } = result.profile;
  const insufficientData = spendingStyle.primaryStyle === null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <RadarIcon size={20} className="text-violet-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.behaviorProfile.title")}</h2>
      </div>

      <div className="space-y-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        {insufficientData ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.behaviorProfile.insufficientData")}</p>
        ) : (
          <>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <CircularScoreGauge score={result.scores.overall} label={t("aiAnalytics.behaviorProfile.scores.overall")} colorClass="stroke-violet-500" />
                {spendingStyle.primaryStyle && (
                  <span className="rounded-full bg-violet-500/15 px-3 py-1 text-sm font-semibold text-violet-600 dark:text-violet-400">
                    {t(`aiAnalytics.behaviorProfile.spendingStyles.${spendingStyle.primaryStyle}`)}
                  </span>
                )}
              </div>

              <div className="w-full min-w-0">
                <BehaviorRadarChart scores={result.scores} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title={t("aiAnalytics.behaviorProfile.charts.heatmap.title")}>
                <BehaviorHeatmap timeAnalysis={timeAnalysis} />
              </ChartCard>
              <ChartCard title={t("aiAnalytics.behaviorProfile.charts.habitCalendar.title")}>
                <HabitCalendar dailyTrend={dailyTrend} now={now} />
              </ChartCard>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MessageList titleKey="aiAnalytics.behaviorProfile.sections.positiveHabits" messages={habitMessages(result.positiveHabits)} />
              <MessageList titleKey="aiAnalytics.behaviorProfile.sections.negativeHabits" messages={habitMessages(result.negativeHabits)} />
              <MessageList titleKey="aiAnalytics.behaviorProfile.sections.improvementOpportunities" messages={result.improvementOpportunities} />
              <MessageList titleKey="aiAnalytics.behaviorProfile.sections.insights" messages={result.insights} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
