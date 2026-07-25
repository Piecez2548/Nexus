import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";

export function useExpenseByCategory() {
  const { transactions } = useTransactionStore();

  return useMemo(() => {
    const byCategory = new Map<string, number>();

    transactions
      .filter((t) => t.type === "expense" && t.category)
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
  }, [transactions]);
}
