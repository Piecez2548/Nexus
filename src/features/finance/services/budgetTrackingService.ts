import { budgetPeriodSnapshotService } from "@/features/finance/services/budgetPeriodSnapshotService";
import { useBudgetPeriodSnapshotStore } from "@/features/finance/store/budgetPeriodSnapshotStore";
import { getCurrentPeriodRange } from "@/features/finance/utils/periodRange";
import { toLocalDateString } from "@/utils/localDate";
import { useToastStore } from "@/store/toastStore";
import { translate } from "@/i18n/useTranslation";
import type { BudgetProgress } from "@/features/finance/utils/budgetStatus";
import type { BudgetPeriodSnapshotStatus } from "@/features/finance/types";

const STATUS_RANK: Record<BudgetPeriodSnapshotStatus, number> = { ok: 0, near: 1, over: 2 };

function toastTypeFor(status: "near" | "over"): "warning" | "error" {
  return status === "over" ? "error" : "warning";
}

// Runs whenever useBudgetProgress() recomputes (from Budget.tsx's own
// effect) -- budget spend changes on any relevant transaction change, not
// just a budget mutation, so this can't hook into budgetStore's own
// add/update/delete the way netWorthTrackingService hooks into
// netWorthItemStore's. Upserts one row per (budget, current period) --
// past-period rows are never touched again once a new period starts,
// since periodStart moves on to a new value.
export async function recordBudgetProgress(progressList: BudgetProgress[]): Promise<void> {
  const existing = await budgetPeriodSnapshotService.list();
  let changed = false;

  for (const { budget, spent, status } of progressList) {
    if (!budget.syncId) continue;

    const range = getCurrentPeriodRange(budget.period);
    const periodStart = toLocalDateString(range.start);
    const periodEnd = toLocalDateString(range.end);

    const existingRow = existing.find((s) => s.budgetSyncId === budget.syncId && s.periodStart === periodStart);

    // The stored status IS the "already notified" guard -- re-recording an
    // unchanged status afterward no longer differs from what's stored, so
    // this only fires once per genuine escalation. A brand new row (no
    // existingRow yet) never toasts even if already near/over on first
    // record -- avoids a flood of toasts for pre-existing over-budget
    // categories the very first time this feature runs.
    if (existingRow && status !== "ok" && STATUS_RANK[status] > STATUS_RANK[existingRow.status]) {
      useToastStore
        .getState()
        .show(toastTypeFor(status), translate(`budget.${status}LimitToast`, { category: budget.category }));
    }

    const spentOrStatusChanged =
      !existingRow || existingRow.spent !== spent || existingRow.status !== status || existingRow.amount !== budget.amount;
    if (!spentOrStatusChanged) continue;

    const snapshot = {
      ...existingRow,
      budgetSyncId: budget.syncId,
      category: budget.category,
      period: budget.period,
      periodStart,
      periodEnd,
      amount: budget.amount,
      spent,
      status,
      recordedAt: new Date().toISOString(),
    };

    if (existingRow?.id !== undefined) {
      await budgetPeriodSnapshotService.update(existingRow.id, snapshot);
    } else {
      await budgetPeriodSnapshotService.create(snapshot);
    }
    changed = true;
  }

  if (changed) await useBudgetPeriodSnapshotStore.getState().loadSnapshots();
}
