import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { generateSpendingAlerts, type SpendingInsight } from "@/features/finance/utils/spendingAlerts";

export type { SpendingInsight };

export function useSpendingInsights(): SpendingInsight[] {
  const { transactions } = useTransactionStore();

  return useMemo(() => generateSpendingAlerts(transactions), [transactions]);
}
