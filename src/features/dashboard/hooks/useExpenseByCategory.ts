import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { getDashboardPeriodRange, type DashboardPeriodGranularity } from "@/features/dashboard/utils/dashboardPeriodRange";
import { computeExpenseByCategory } from "@/features/finance/utils/expenseByCategory";

// `granularity` is optional so any caller that doesn't opt into the
// Dashboard page's day/month/year selector (e.g. the separate Finance
// Dashboard page) keeps summing all-time, its exact original behavior.
export function useExpenseByCategory(now = new Date(), granularity?: DashboardPeriodGranularity) {
  const { transactions } = useTransactionStore();

  return useMemo(() => {
    const range = granularity === undefined ? undefined : getDashboardPeriodRange(granularity, now);
    return computeExpenseByCategory(transactions, range);
  }, [transactions, now, granularity]);
}
