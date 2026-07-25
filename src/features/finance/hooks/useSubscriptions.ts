import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import type { RecurringFrequency, Transaction } from "@/features/finance/types";

export interface Subscription {
  title: string;
  category?: string;
  frequency: RecurringFrequency;
  amount: number;
  monthlyEquivalent: number;
  lastDate: string;
}

const MONTHLY_MULTIPLIER: Record<RecurringFrequency, number> = {
  daily: 30,
  weekly: 4.345,
  monthly: 1,
  yearly: 1 / 12,
};

export function useSubscriptions() {
  const { transactions } = useTransactionStore();

  return useMemo(() => {
    // A "subscription" is the most recent transaction for each recurring
    // expense title — recurring is a per-transaction flag, not its own
    // entity, so this collapses repeated instances into one active summary.
    const latestByTitle = new Map<string, Transaction>();

    for (const t of transactions) {
      if (t.type !== "expense" || !t.recurring) continue;

      const key = t.title.trim().toLowerCase();
      const existing = latestByTitle.get(key);
      if (!existing || t.date > existing.date) {
        latestByTitle.set(key, t);
      }
    }

    const subscriptions: Subscription[] = Array.from(latestByTitle.values())
      .map((t) => {
        const frequency = t.recurring!.frequency;
        return {
          title: t.title,
          category: t.category,
          frequency,
          amount: t.amount,
          monthlyEquivalent: t.amount * MONTHLY_MULTIPLIER[frequency],
          lastDate: t.date,
        };
      })
      .sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);

    const totalMonthly = subscriptions.reduce((sum, s) => sum + s.monthlyEquivalent, 0);

    return { subscriptions, totalMonthly };
  }, [transactions]);
}
