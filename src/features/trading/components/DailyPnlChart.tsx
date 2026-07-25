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

export default function DailyPnlChart() {
  const { dailyPnl } = useTradingAnalytics();
  const { t } = useTranslation();

  return (
    <ChartCard title={t("trading.dailyPnl")}>
      {dailyPnl.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-zinc-600 dark:text-zinc-500">
          {t("trading.noClosedTrades")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dailyPnl}>
            <CartesianGrid stroke="#333" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />

            <Bar dataKey="pnl" name="P/L" radius={[4, 4, 0, 0]}>
              {dailyPnl.map((entry, index) => (
                <Cell key={index} fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
