import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { recordBudgetProgress } from "./budgetTrackingService";
import { useBudgetPeriodSnapshotStore } from "@/features/finance/store/budgetPeriodSnapshotStore";
import { useToastStore } from "@/store/toastStore";
import { getCurrentPeriodRange } from "@/features/finance/utils/periodRange";
import { toLocalDateString } from "@/utils/localDate";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import type { BudgetProgress } from "@/features/finance/utils/budgetStatus";
import type { Budget } from "@/features/finance/types";

function budget(overrides: Partial<Budget> = {}): Budget {
  return { id: 1, syncId: "budget-1", category: "Food", amount: 5000, period: "monthly", ...overrides };
}

function progress(overrides: Partial<BudgetProgress> = {}): BudgetProgress {
  return {
    budget: budget(),
    spent: 1000,
    remaining: 4000,
    percentage: 20,
    status: "ok",
    ...overrides,
  };
}

const range = getCurrentPeriodRange("monthly");
const periodStart = toLocalDateString(range.start);

describe("recordBudgetProgress", () => {
  beforeEach(async () => {
    await db.budgetPeriodSnapshots.clear();
    useBudgetPeriodSnapshotStore.setState({ snapshots: [], loading: false, error: null });
    // Asserted on directly below instead of spying on the store's own
    // `show` action -- spying on a Zustand action is unreliable here since
    // show() itself calls set(), which replaces the store's state object
    // and carries the spy forward into every later state, outliving any
    // per-test restore.
    useToastStore.setState({ toasts: [] });
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("creates a new snapshot row for the current period", async () => {
    await recordBudgetProgress([progress()]);

    const rows = await db.budgetPeriodSnapshots.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ budgetSyncId: "budget-1", category: "Food", periodStart, spent: 1000, status: "ok" });
  });

  it("upserts (does not duplicate) the same budget/period on a second call", async () => {
    await recordBudgetProgress([progress({ spent: 1000 })]);
    await recordBudgetProgress([progress({ spent: 2000 })]);

    const rows = await db.budgetPeriodSnapshots.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].spent).toBe(2000);
  });

  it("skips a budget with no syncId (not yet persisted)", async () => {
    await recordBudgetProgress([progress({ budget: budget({ syncId: undefined }) })]);

    const rows = await db.budgetPeriodSnapshots.toArray();
    expect(rows).toHaveLength(0);
  });

  it("does not toast on the first-ever record even if already over/near limit", async () => {
    await recordBudgetProgress([progress({ status: "over", spent: 6000 })]);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("fires exactly one warning toast on a genuine ok -> near escalation", async () => {
    await recordBudgetProgress([progress({ status: "ok", spent: 1000 })]);
    useToastStore.setState({ toasts: [] });

    await recordBudgetProgress([progress({ status: "near", spent: 4200 })]);

    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe("warning");
  });

  it("fires an error toast on a near -> over escalation", async () => {
    await recordBudgetProgress([progress({ status: "near", spent: 4200 })]);
    useToastStore.setState({ toasts: [] });

    await recordBudgetProgress([progress({ status: "over", spent: 5500 })]);

    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe("error");
  });

  it("does not re-toast when the status is recorded again unchanged", async () => {
    await recordBudgetProgress([progress({ status: "over", spent: 6000 })]);
    await recordBudgetProgress([progress({ status: "over", spent: 6000 })]);
    useToastStore.setState({ toasts: [] });

    await recordBudgetProgress([progress({ status: "over", spent: 6100 })]);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("does not toast on a downgrade (over -> near improving)", async () => {
    await recordBudgetProgress([progress({ status: "over", spent: 6000 })]);
    useToastStore.setState({ toasts: [] });

    await recordBudgetProgress([progress({ status: "near", spent: 4200 })]);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("refreshes the snapshot store after recording", async () => {
    await recordBudgetProgress([progress()]);

    expect(useBudgetPeriodSnapshotStore.getState().snapshots).toHaveLength(1);
  });
});
