import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";

import { useTradingAnalytics } from "@/features/trading/hooks/useTradingAnalytics";
import ChartCard from "@/components/ui/ChartCard";
import { useTranslation } from "@/i18n/useTranslation";

export default function DrawdownChart() {
  const { equityCurve } = useTradingAnalytics();
  const { t } = useTranslation();

  return (
    <ChartCard title={t("trading.drawdown")}>
      {equityCurve.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-zinc-600 dark:text-zinc-500">
          {t("trading.noClosedTrades")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={equityCurve}>
            <defs>
              <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#333" />
            <XAxis dataKey="date" />
            <YAxis unit="%" />
            <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />

            <Area
              type="monotone"
              dataKey="drawdownPercent"
              name={t("trading.drawdown")}
              stroke="#ef4444"
              fill="url(#drawdownGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
