import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import type { RecurringFrequency, Transaction } from "@/features/finance/types";

// Named "Detected" (not "Subscription") specifically to avoid colliding
// with -- and being mistaken for -- the real, independently-tracked
// `Subscription` domain entity (FIN-004, finance/types/index.ts). This is
// a purely derived view over existing recurring-flagged transactions, not
// a managed record: no id, no status, no independent lifecycle.
export interface DetectedSubscription {
  title: string;
  category?: string;
  frequency: RecurringFrequency;
  amount: number;
  monthlyEquivalent: number;
  lastDate: string;
}

// Exported so FIN-004's own monthly-equivalent calculation
// (finance/utils/subscriptionMath.ts) reuses this exact table instead of
// redefining it a second time.
export const MONTHLY_MULTIPLIER: Record<RecurringFrequency, number> = {
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

    const subscriptions: DetectedSubscription[] = Array.from(latestByTitle.values())
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
