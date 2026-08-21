import { Link } from "react-router-dom";
import { LineChart, Percent, Activity } from "lucide-react";

import SummaryCard from "@/components/ui/SummaryCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { ExecutiveTradingSnapshot } from "@/features/executive/types";

interface Props {
  trading: ExecutiveTradingSnapshot;
}

function formatPnl(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function TradingSnapshotSection({ trading }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("executive.trading.title")}</h2>
        <Link to="/trading" className="flex items-center gap-1 text-sm text-brand-500 hover:underline">
          <LineChart size={16} />
          {t("common.viewAll")}
        </Link>
      </div>

      {trading.totalClosedTrades === 0 ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">{t("executive.trading.empty")}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <SummaryCard
            title={t("executive.trading.weeklyPnl")}
            value={formatPnl(trading.weeklyPnl)}
            icon={<Activity size={20} />}
            color={trading.weeklyPnl >= 0 ? "#16a34a" : "#dc2626"}
          />

          <SummaryCard
            title={t("executive.trading.winRate")}
            value={`${trading.winRate.toFixed(1)}%`}
            icon={<Percent size={20} />}
            color="#ca8a04"
          />
        </div>
      )}
    </div>
  );
}
