import { Repeat, PauseCircle, Ban } from "lucide-react";

import SummaryCard from "@/components/ui/SummaryCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { useSubscriptionStats } from "@/features/finance/hooks/useSubscriptionStats";

type Stats = ReturnType<typeof useSubscriptionStats>;

export default function SubscriptionSummaryGrid(stats: Stats) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title={t("subscriptions.activeCount")}
        value={String(stats.activeCount)}
        color="#16a34a"
        icon={<Repeat size={22} />}
      />

      <SummaryCard
        title={t("subscriptions.totalMonthly")}
        value={`฿${stats.totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        color="var(--color-brand-600)"
        icon={<Repeat size={22} />}
      />

      <SummaryCard
        title={t("subscriptions.totalYearly")}
        value={`฿${stats.totalYearly.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        color="#dc2626"
        icon={<Repeat size={22} />}
      />

      <SummaryCard
        title={t("subscriptions.pausedAndCancelled")}
        value={`${stats.pausedCount + stats.cancelledCount}`}
        color="#71717a"
        icon={stats.cancelledCount > stats.pausedCount ? <Ban size={22} /> : <PauseCircle size={22} />}
      />
    </div>
  );
}
