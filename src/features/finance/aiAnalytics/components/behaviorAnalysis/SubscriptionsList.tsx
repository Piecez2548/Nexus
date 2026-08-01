import { useTranslation } from "@/i18n/useTranslation";
import type { SubscriptionEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

interface Props {
  subscriptions: SubscriptionEntry[];
}

export default function SubscriptionsList({ subscriptions }: Props) {
  const { t } = useTranslation();

  if (subscriptions.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.behaviorAnalysis.noSubscriptions")}</p>;
  }

  return (
    <ul className="space-y-2">
      {subscriptions.map((s) => (
        <li key={`${s.normalizedTitle}|${s.category ?? ""}`} className="flex items-center justify-between text-sm">
          <div>
            <div className="font-medium">{s.representativeTitle}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("aiAnalytics.behaviorAnalysis.subscriptionSummary", { count: s.occurrenceCount, days: Math.round(s.averageIntervalDays) })}
            </div>
          </div>
          <span className="font-medium">฿{Math.round(s.averageAmount).toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
