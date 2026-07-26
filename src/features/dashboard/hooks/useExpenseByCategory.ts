import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { getDashboardPeriodRange, type DashboardPeriodGranularity } from "@/features/dashboard/utils/dashboardPeriodRange";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";

// `granularity` is optional so any caller that doesn't opt into the
// Dashboard page's day/month/year selector (e.g. the separate Finance
// Dashboard page) keeps summing all-time, its exact original behavior.
export function useExpenseByCategory(now = new Date(), granularity?: DashboardPeriodGranularity) {
  const { transactions } = useTransactionStore();

  return useMemo(() => {
    const range = granularity === undefined ? undefined : getDashboardPeriodRange(granularity, now);
    const byCategory = new Map<string, number>();

    transactions
      .filter((t) => t.type === "expense" && t.category && (range === undefined || isDateWithinRange(t.date, range)))
      .forEach((t) => {
        const category = t.category as string;
        byCategory.set(
          category,
          (byCategory.get(category) ?? 0) + t.amount
        );
      });

    return Array.from(byCategory.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [transactions, now, granularity]);
}
