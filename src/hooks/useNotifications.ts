import { useMemo } from "react";
import { useSpendingInsights } from "@/features/finance/hooks/useSpendingInsights";
import { useBudgetProgress } from "@/features/finance/hooks/useBudgetProgress";
import { useNotificationStore } from "@/store/notificationStore";

export interface AppNotification {
  id: string;
  key: string;
  params: Record<string, string | number>;
  severity: "info" | "warning";
}

export function useNotifications(): AppNotification[] {
  const insights = useSpendingInsights();
  const budgetProgress = useBudgetProgress();
  const dismissedIds = useNotificationStore((state) => state.dismissedIds);

  return useMemo(() => {
    const budgetAlerts: AppNotification[] = budgetProgress
      .filter((b) => b.status !== "ok")
      .map((b) => {
        const params: Record<string, string | number> =
          b.status === "over"
            ? { category: b.budget.category, spent: b.spent.toLocaleString(), budgetAmount: b.budget.amount.toLocaleString() }
            : { category: b.budget.category, percent: Math.round(b.percentage) };

        return {
          id: `budget-${b.budget.id}`,
          key: b.status === "over" ? "topbar.notificationMessages.budgetOver" : "topbar.notificationMessages.budgetNearLimit",
          params,
          severity: "warning" as const,
        };
      });

    const insightAlerts: AppNotification[] = insights.map((insight) => ({
      id: insight.id,
      key: insight.key,
      params: insight.params,
      severity: insight.severity,
    }));

    return [...budgetAlerts, ...insightAlerts].filter((n) => !dismissedIds.includes(n.id));
  }, [insights, budgetProgress, dismissedIds]);
}
