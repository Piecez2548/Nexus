import { netWorthSnapshotService } from "@/features/finance/services/netWorthSnapshotService";
import { useNetWorthSnapshotStore } from "@/features/finance/store/netWorthSnapshotStore";
import { calculateNetWorthTotals } from "@/features/finance/utils/netWorthMath";
import { toLocalDateString } from "@/utils/localDate";
import type { NetWorthItem } from "@/features/finance/types";

// Runs on the write path (netWorthItemStore's add/update/delete), the same
// way checkAndLogCrossings runs on goalStore's write path — the history log
// is a side effect of the entity it summarizes, not something a person
// writes to directly. One row per calendar day: today's totals overwrite
// today's existing row (if any) rather than appending a new one, so
// several edits in the same day don't clutter the trend with near-duplicate
// points — mirrors WorkoutEntry.date's "YYYY-MM-DD local" convention.
export async function recordSnapshot(items: NetWorthItem[]): Promise<void> {
  const totals = calculateNetWorthTotals(items);
  const today = toLocalDateString(new Date());

  const existing = await netWorthSnapshotService.list();
  const todayRow = existing.find((s) => s.date === today);

  const snapshot = {
    ...todayRow,
    date: today,
    totalAssets: totals.totalAssets,
    totalLiabilities: totals.totalLiabilities,
    netWorth: totals.netWorth,
    recordedAt: new Date().toISOString(),
  };

  if (todayRow?.id !== undefined) {
    await netWorthSnapshotService.update(todayRow.id, snapshot);
  } else {
    await netWorthSnapshotService.create(snapshot);
  }

  await useNetWorthSnapshotStore.getState().loadSnapshots();
}
