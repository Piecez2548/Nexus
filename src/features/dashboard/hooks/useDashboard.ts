import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { getDashboardPeriodRange, getPreviousDashboardPeriodRange, type DashboardPeriodGranularity } from "@/features/dashboard/utils/dashboardPeriodRange";
import { cumulativeBalanceAsOf, monthKey, pctChange, sumByType } from "@/features/finance/utils/cashFlowMath";

// `granularity` defaults to "month" so any caller that doesn't opt into the
// Dashboard page's day/month/year selector (e.g. the separate Finance
// Dashboard page) keeps its exact original month-over-month behavior.
export function useDashboard(now = new Date(), granularity: DashboardPeriodGranularity = "month") {
  const { transactions } = useTransactionStore();

  return useMemo(() => {
    // Balance is all-time and unaffected by the period selector.
    const balance = sumByType(transactions, "income") - sumByType(transactions, "expense");

    const range = getDashboardPeriodRange(granularity, now);
    const previousRange = getPreviousDashboardPeriodRange(granularity, now);

    const income = sumByType(transactions, "income", range);
    const expense = sumByType(transactions, "expense", range);
    const saving = income - expense;

    const prevIncome = sumByType(transactions, "income", previousRange);
    const prevExpense = sumByType(transactions, "expense", previousRange);
    const prevSaving = prevIncome - prevExpense;

    const currentMonth = monthKey(now);
    const previousMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const curBalance = cumulativeBalanceAsOf(transactions, currentMonth);
    const prevBalance = cumulativeBalanceAsOf(transactions, previousMonth);

    return {
      income,
      expense,
      balance,
      saving,
      changes: {
        income: pctChange(income, prevIncome),
        expense: pctChange(expense, prevExpense),
        saving: pctChange(saving, prevSaving),
        balance: pctChange(curBalance, prevBalance),
      },
      // Raw current/previous-period figures, for panels that want the
      // actual numbers rather than just the derived % change (named
      // `monthly` for its original month-over-month use — the values
      // reflect whichever `granularity` was requested).
      monthly: {
        current: { income, expense, saving },
        previous: { income: prevIncome, expense: prevExpense, saving: prevSaving },
      },
    };
  }, [transactions, now, granularity]);
}
