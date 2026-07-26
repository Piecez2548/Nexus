import {
    ResponsiveContainer,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    LineChart,
    Line
} from "recharts";
import { format, parse } from "date-fns";

import { useChartData } from "@/features/dashboard/hooks/useChartData";
import type { DashboardPeriodGranularity } from "@/features/dashboard/utils/dashboardPeriodRange";
import { useTranslation } from "@/i18n/useTranslation";

interface CashFlowTooltipProps {
    active?: boolean;
    label?: string;
    payload?: { dataKey?: string; value?: number; payload?: { balance?: number } }[];
    incomeLabel: string;
    expenseLabel: string;
    balanceLabel: string;
}

function CashFlowTooltip({ active, label, payload, incomeLabel, expenseLabel, balanceLabel }: CashFlowTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    const income = payload.find((p) => p.dataKey === "income")?.value ?? 0;
    const expense = payload.find((p) => p.dataKey === "expense")?.value ?? 0;
    const balance = payload[0]?.payload?.balance ?? 0;

    return (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm shadow-lg">
            <p className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
            <p className="text-green-500">{incomeLabel} : ฿{income.toLocaleString()}</p>
            <p className="text-red-500">{expenseLabel} : ฿{expense.toLocaleString()}</p>
            <p className="text-zinc-700 dark:text-zinc-300">{balanceLabel} : ฿{balance.toLocaleString()}</p>
        </div>
    );
}

interface Props {
    granularity?: DashboardPeriodGranularity;
}

export default function CashFlowLineChart({ granularity }: Props) {
    const daily = useChartData(new Date(), granularity);
    const { t } = useTranslation();

    const hasData = daily.some((item) => item.income > 0 || item.expense > 0);

    if (!hasData) {
        return (
            <div className="flex h-[320px] items-center justify-center text-zinc-600 dark:text-zinc-500">
                {t("dashboard.noIncomeExpenseData")}
            </div>
        );
    }

    const data = daily.map((item) => ({
        ...item,
        date: format(parse(item.date, "yyyy-MM-dd", new Date()), "d MMM"),
    }));

    return (
        <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>

                <CartesianGrid stroke="#333"/>

                <XAxis dataKey="date"/>

                <YAxis/>

                <Tooltip
                    content={
                        <CashFlowTooltip
                            incomeLabel={t("dashboard.income")}
                            expenseLabel={t("dashboard.expense")}
                            balanceLabel={t("dashboard.balance")}
                        />
                    }
                />

                <Line
                    type="monotone"
                    dataKey="income"
                    name={t("dashboard.income")}
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                />

                <Line
                    type="monotone"
                    dataKey="expense"
                    name={t("dashboard.expense")}
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                />

            </LineChart>
        </ResponsiveContainer>
    );
}
