import type { BudgetProgress } from "@/features/finance/utils/budgetStatus";

// Shared between BudgetTable.tsx (Budget page) and the AI Analytics Budget
// Analysis section, so a budget's status always maps to the same color
// wherever it's shown.
export const STATUS_COLOR: Record<BudgetProgress["status"], string> = {
  ok: "bg-green-500",
  near: "bg-amber-500",
  over: "bg-red-500",
};
