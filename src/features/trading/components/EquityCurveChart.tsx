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

export default function EquityCurveChart() {
  const { equityCurve } = useTradingAnalytics();
  const { t } = useTranslation();

  return (
    <ChartCard title={t("trading.equityCurve")}>
      {equityCurve.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-zinc-600 dark:text-zinc-500">
          {t("trading.noClosedTrades")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={equityCurve}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#333" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />

            <Area
              type="monotone"
              dataKey="equity"
              name="Equity"
              stroke="#8b5cf6"
              fill="url(#equityGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
