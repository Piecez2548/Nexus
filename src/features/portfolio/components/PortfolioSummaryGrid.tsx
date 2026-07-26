import { Layers, Wallet, BarChart3, TrendingUp, TrendingDown } from "lucide-react";

import SummaryCard from "@/components/ui/SummaryCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { usePortfolioStats } from "@/features/portfolio/hooks/usePortfolioStats";

type Stats = ReturnType<typeof usePortfolioStats>;

function formatMoney(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function PortfolioSummaryGrid(stats: Stats) {
  const { t } = useTranslation();

  const isPartial = stats.pricedHoldingsCount > 0 && stats.pricedHoldingsCount < stats.holdingsCount;
  const pnlTitle = isPartial
    ? `${t("portfolio.totalUnrealizedPnl")} (${t("portfolio.pricedOfTotal", {
        priced: stats.pricedHoldingsCount,
        total: stats.holdingsCount,
      })})`
    : t("portfolio.totalUnrealizedPnl");

  const pnlValue =
    stats.totalUnrealizedPnl === null
      ? t("portfolio.noPriceYetShort")
      : `${formatMoney(stats.totalUnrealizedPnl)} (${formatMoney(stats.totalUnrealizedPnlPercent ?? 0)}%)`;

  const pnlColor =
    stats.totalUnrealizedPnl === null ? "#71717a" : stats.totalUnrealizedPnl >= 0 ? "#16a34a" : "#dc2626";

  const pnlIcon =
    stats.totalUnrealizedPnl !== null && stats.totalUnrealizedPnl < 0 ? (
      <TrendingDown size={22} />
    ) : (
      <TrendingUp size={22} />
    );

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title={t("portfolio.holdingsCount")}
        value={String(stats.holdingsCount)}
        color="#2563eb"
        icon={<Layers size={22} />}
      />

      <SummaryCard
        title={t("portfolio.totalCostBasis")}
        value={stats.totalCostBasis.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        color="#7c3aed"
        icon={<Wallet size={22} />}
      />

      <SummaryCard
        title={t("portfolio.totalCurrentValue")}
        value={stats.totalCurrentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        color="#0891b2"
        icon={<BarChart3 size={22} />}
      />

      <SummaryCard title={pnlTitle} value={pnlValue} color={pnlColor} icon={pnlIcon} />
    </div>
  );
}
