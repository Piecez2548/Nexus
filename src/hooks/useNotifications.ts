import { useMemo } from "react";
import { useSpendingInsights } from "@/features/finance/hooks/useSpendingInsights";
import { useBudgetProgress } from "@/features/finance/hooks/useBudgetProgress";
import { useNotificationStore } from "@/store/notificationStore";

export interface AppNotification {
  id: string;
  message: string;
  severity: "info" | "warning";
}

export function useNotifications(): AppNotification[] {
  const insights = useSpendingInsights();
  const budgetProgress = useBudgetProgress();
  const dismissedIds = useNotificationStore((state) => state.dismissedIds);

  return useMemo(() => {
    const budgetAlerts: AppNotification[] = budgetProgress
      .filter((b) => b.status !== "ok")
      .map((b) => ({
        id: `budget-${b.budget.id}`,
        message:
          b.status === "over"
            ? `งบประมาณ${b.budget.category}เกินแล้ว (฿${b.spent.toLocaleString()} / ฿${b.budget.amount.toLocaleString()})`
            : `งบประมาณ${b.budget.category}ใกล้เต็มแล้ว (${Math.round(b.percentage)}%)`,
        severity: "warning" as const,
      }));

    const insightAlerts: AppNotification[] = insights.map((insight) => ({
      id: insight.id,
      message: insight.message,
      severity: insight.severity,
    }));

    return [...budgetAlerts, ...insightAlerts].filter((n) => !dismissedIds.includes(n.id));
  }, [insights, budgetProgress, dismissedIds]);
}
