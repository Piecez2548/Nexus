import { Radar as RadarIcon } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import type { BehaviorSummary } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";
import type { BehaviorMessage, DetectedHabit } from "@/features/finance/aiAnalytics/engine/behavior/types";

interface Props {
  result: BehaviorSummary;
}

// Mirrors behaviorProfile/BehaviorProfileSection.tsx's own MessageList +
// spending-style pill — behaviorSummary.spendingStyle/insights/
// top*Habits are the exact same types/values as that section's own
// (profile.spendingStyle/insights/positiveHabits/negativeHabits), so the
// same i18n keys and styling apply verbatim.
function MessageList({ titleKey, messages }: { titleKey: string; messages: BehaviorMessage[] }) {
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

function habitMessages(habits: DetectedHabit[]): BehaviorMessage[] {
  return habits.map((h) => h.message);
}

export default function BehaviorSummaryCard({ result }: Props) {
  const { t } = useTranslation();
  const hasContent = result.insights.length > 0 || result.topPositiveHabits.length > 0 || result.topNegativeHabits.length > 0;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RadarIcon size={18} className="text-violet-500" />
          <h3 className="text-sm font-semibold">{t("aiAnalytics.executiveSummaryReport.behaviorSummary.title")}</h3>
        </div>
        {result.spendingStyle.primaryStyle && (
          <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-600 dark:text-violet-400">
            {t(`aiAnalytics.behaviorProfile.spendingStyles.${result.spendingStyle.primaryStyle}`)}
          </span>
        )}
      </div>

      {!hasContent ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.behaviorProfile.insufficientData")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <MessageList titleKey="aiAnalytics.behaviorProfile.sections.insights" messages={result.insights} />
          <MessageList titleKey="aiAnalytics.behaviorProfile.sections.positiveHabits" messages={habitMessages(result.topPositiveHabits)} />
          <MessageList titleKey="aiAnalytics.behaviorProfile.sections.negativeHabits" messages={habitMessages(result.topNegativeHabits)} />
        </div>
      )}
    </div>
  );
}
