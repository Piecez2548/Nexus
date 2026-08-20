import {
  TrendingUp,
  TrendingDown,
  Percent,
  Target,
  Scale,
  ArrowDownRight,
  Activity,
  Sigma,
  Timer,
} from "lucide-react";

import SummaryCard from "@/components/ui/SummaryCard";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  todayPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  winRate: number;
  profitFactor: number;
  averageRR: number;
  maxDrawdown: number;
  openPositions: number;
  expectancy: number | null;
  averageHoldingMinutes: number | null;
}

function formatMoney(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatProfitFactor(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  return value.toFixed(2);
}

function formatExpectancy(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

function formatHoldingTime(minutes: number | null): string {
  if (minutes === null) return "—";
  const total = Math.round(minutes);
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function TradingSummaryGrid({
  todayPnl,
  weeklyPnl,
  monthlyPnl,
  winRate,
  profitFactor,
  averageRR,
  maxDrawdown,
  openPositions,
  expectancy,
  averageHoldingMinutes,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title={t("dashboard.todaysPnl")}
        value={formatMoney(todayPnl)}
        color={todayPnl >= 0 ? "#16a34a" : "#dc2626"}
        icon={todayPnl >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
      />

      <SummaryCard
        title={t("trading.weeklyPnl")}
        value={formatMoney(weeklyPnl)}
        color={weeklyPnl >= 0 ? "#16a34a" : "#dc2626"}
        icon={weeklyPnl >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
      />

      <SummaryCard
        title={t("dashboard.monthlyPnl")}
        value={formatMoney(monthlyPnl)}
        color={monthlyPnl >= 0 ? "#16a34a" : "#dc2626"}
        icon={monthlyPnl >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
      />

      <SummaryCard
        title={t("dashboard.openPositions")}
        value={String(openPositions)}
        color="#2563eb"
        icon={<Activity size={22} />}
      />

      <SummaryCard
        title={t("dashboard.winRate")}
        value={`${winRate.toFixed(1)}%`}
        color="#ca8a04"
        icon={<Percent size={22} />}
      />

      <SummaryCard
        title={t("trading.profitFactor")}
        value={formatProfitFactor(profitFactor)}
        color="var(--color-brand-600)"
        icon={<Scale size={22} />}
      />

      <SummaryCard
        title={t("trading.averageRr")}
        value={`${averageRR.toFixed(2)}R`}
        color="#0891b2"
        icon={<Target size={22} />}
      />

      <SummaryCard
        title={t("trading.maxDrawdown")}
        value={maxDrawdown.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        color="#dc2626"
        icon={<ArrowDownRight size={22} />}
      />

      <SummaryCard
        title={t("trading.expectancy")}
        value={formatExpectancy(expectancy)}
        color={expectancy === null || expectancy >= 0 ? "#16a34a" : "#dc2626"}
        icon={<Sigma size={22} />}
      />

      <SummaryCard
        title={t("trading.averageHoldingTime")}
        value={formatHoldingTime(averageHoldingMinutes)}
        color="#7c3aed"
        icon={<Timer size={22} />}
      />
    </div>
  );
}
