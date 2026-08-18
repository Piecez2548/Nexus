import { TrendingUp, TrendingDown, Scale } from "lucide-react";

import SummaryCard from "@/components/ui/SummaryCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { useNetWorthStats } from "@/features/finance/hooks/useNetWorthStats";

type Stats = ReturnType<typeof useNetWorthStats>;

export default function NetWorthSummaryGrid(stats: Stats) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <SummaryCard
        title={t("netWorth.totalAssets")}
        value={`฿${stats.totalAssets.toLocaleString()}`}
        color="#16a34a"
        icon={<TrendingUp size={22} />}
      />

      <SummaryCard
        title={t("netWorth.totalLiabilities")}
        value={`฿${stats.totalLiabilities.toLocaleString()}`}
        color="#dc2626"
        icon={<TrendingDown size={22} />}
      />

      <SummaryCard
        title={t("netWorth.netWorth")}
        value={`฿${stats.netWorth.toLocaleString()}`}
        color={stats.netWorth >= 0 ? "var(--color-brand-600)" : "#dc2626"}
        icon={<Scale size={22} />}
      />
    </div>
  );
}
