import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts";
import { format, parse } from "date-fns";

import { useTranslation } from "@/i18n/useTranslation";
import type { NetWorthSnapshot } from "@/features/finance/types";

interface NetWorthTooltipProps {
  active?: boolean;
  label?: string;
  payload?: { value?: number }[];
  netWorthLabel: string;
}

function NetWorthTooltip({ active, label, payload, netWorthLabel }: NetWorthTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
      <p className="text-zinc-700 dark:text-zinc-300">{netWorthLabel} : ฿{(payload[0]?.value ?? 0).toLocaleString()}</p>
    </div>
  );
}

interface Props {
  snapshots: NetWorthSnapshot[];
}

// Needs at least two distinct days of history to draw a meaningful trend —
// a single point is just today's total again, already shown in the summary
// grid above this chart. Mirrors CashFlowLineChart.tsx's own no-data guard.
export default function NetWorthHistoryChart({ snapshots }: Props) {
  const { t } = useTranslation();

  if (snapshots.length < 2) {
    return (
      <div className="flex h-[240px] items-center justify-center text-center text-zinc-600 dark:text-zinc-500">
        {t("netWorth.notEnoughHistory")}
      </div>
    );
  }

  const data = [...snapshots]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: format(parse(s.date, "yyyy-MM-dd", new Date()), "d MMM"),
      netWorth: s.netWorth,
    }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid stroke="#333" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip content={<NetWorthTooltip netWorthLabel={t("netWorth.netWorth")} />} />
        <Line
          type="monotone"
          dataKey="netWorth"
          name={t("netWorth.netWorth")}
          stroke="var(--color-brand-600)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
