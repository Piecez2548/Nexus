import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer
} from "recharts";

import { useExpenseByCategory } from "@/features/dashboard/hooks/useExpenseByCategory";
import type { DashboardPeriodGranularity } from "@/features/dashboard/utils/dashboardPeriodRange";
import { useTranslation } from "@/i18n/useTranslation";

const COLORS = [
    "#8b5cf6",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
    "#ec4899",
    "#3b82f6",
    "#84cc16",
];

interface Props {
    granularity?: DashboardPeriodGranularity;
}

export default function ExpensePieChart({ granularity }: Props) {
    const data = useExpenseByCategory(new Date(), granularity);
    const { t } = useTranslation();

    if (data.length === 0) {
        return (
            <div className="flex h-[320px] items-center justify-center text-zinc-600 dark:text-zinc-500">
                {t("dashboard.noExpenseData")}
            </div>
        );
    }

    const sorted = [...data].sort((a, b) => b.value - a.value);
    const total = sorted.reduce((sum, item) => sum + item.value, 0);

    return (
        <div>
            <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                    <PieChart>

                        <Pie
                            data={sorted}
                            dataKey="value"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                        >

                            {sorted.map((_, index) => (

                                <Cell
                                    key={index}
                                    fill={COLORS[index % COLORS.length]}
                                />

                            ))}

                        </Pie>

                        <Tooltip />

                    </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">฿{total.toLocaleString()}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{t("common.total")}</span>
                </div>
            </div>

            <div className="mt-4 grid max-h-32 grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto">
                {sorted.map((item, index) => {
                    const percentage = total > 0 ? (item.value / total) * 100 : 0;

                    return (
                        <div key={item.name} className="text-sm">
                            <div className="flex items-center gap-1.5">
                                <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="truncate">{item.name}</span>
                            </div>

                            <span className="pl-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                                ฿{item.value.toLocaleString()} ({percentage.toFixed(1)}%)
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
