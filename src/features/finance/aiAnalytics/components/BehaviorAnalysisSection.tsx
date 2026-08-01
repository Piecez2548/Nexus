import { Clock, Users2 } from "lucide-react";
import ChartCard from "@/components/ui/ChartCard";
import BehaviorFlagCard from "@/features/finance/aiAnalytics/components/behaviorAnalysis/BehaviorFlagCard";
import SubscriptionsList from "@/features/finance/aiAnalytics/components/behaviorAnalysis/SubscriptionsList";
import ImpulsePurchasesList from "@/features/finance/aiAnalytics/components/behaviorAnalysis/ImpulsePurchasesList";
import LargestTransactionsList from "@/features/finance/aiAnalytics/components/spendingAnalysis/LargestTransactionsList";
import { useTranslation } from "@/i18n/useTranslation";
import type { BehaviorAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

interface Props {
  result: BehaviorAnalysisResult;
}

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export default function BehaviorAnalysisSection({ result }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users2 size={20} className="text-cyan-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.behaviorAnalysis.title")}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {result.flags.map((flag) => (
          <BehaviorFlagCard key={flag.key} flag={flag} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Clock size={16} className="text-zinc-500 dark:text-zinc-400" />
            {t("aiAnalytics.behaviorAnalysis.mostActiveHour", { hour: String(result.mostActiveHour.hour ?? 0).padStart(2, "0") })}
          </div>
          {result.mostActiveHour.hour === null && (
            <p className="text-xs text-amber-500">{t("aiAnalytics.behaviorAnalysis.mostActiveHourUnavailable")}</p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Clock size={16} className="text-zinc-500 dark:text-zinc-400" />
            {result.mostActiveWeekday
              ? t("aiAnalytics.behaviorAnalysis.mostActiveWeekday", { weekday: t(`aiAnalytics.weekdays.${WEEKDAY_KEYS[result.mostActiveWeekday.weekday]}`) })
              : t("aiAnalytics.behaviorAnalysis.mostActiveWeekdayUnavailable")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title={t("aiAnalytics.behaviorAnalysis.largePurchases")}>
          <LargestTransactionsList purchases={result.largePurchases} />
        </ChartCard>

        <ChartCard title={t("aiAnalytics.behaviorAnalysis.subscriptions")}>
          <SubscriptionsList subscriptions={result.subscriptions} />
        </ChartCard>

        <ChartCard title={t("aiAnalytics.behaviorAnalysis.impulsePurchases")}>
          <ImpulsePurchasesList purchases={result.impulsePurchases} />
        </ChartCard>
      </div>
    </div>
  );
}
