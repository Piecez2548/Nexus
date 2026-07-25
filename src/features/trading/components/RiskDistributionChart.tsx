import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

import { useTradingAnalytics } from "@/features/trading/hooks/useTradingAnalytics";
import ChartCard from "@/components/ui/ChartCard";
import { useTranslation } from "@/i18n/useTranslation";

export default function RiskDistributionChart() {
  const { riskDistribution } = useTradingAnalytics();
  const hasData = riskDistribution.some((bucket) => bucket.count > 0);
  const { t } = useTranslation();

  return (
    <ChartCard title={t("trading.riskDistribution")}>
      {!hasData ? (
        <div className="flex h-[220px] items-center justify-center text-zinc-600 dark:text-zinc-500">
          {t("trading.notEnoughData")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={riskDistribution}>
            <CartesianGrid stroke="#333" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />

            <Bar dataKey="count" name="Trades" radius={[4, 4, 0, 0]}>
              {riskDistribution.map((entry, index) => (
                <Cell key={index} fill={entry.isPositive ? "#22c55e" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
