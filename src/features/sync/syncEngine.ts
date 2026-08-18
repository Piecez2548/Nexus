import { db } from "@/database/db";
import { supabase, isSyncConfigured } from "@/lib/supabaseClient";
import { withSyncMeta } from "@/utils/syncMeta";
import { dedupeAccountsAndCategories } from "@/features/finance/utils/dedupeAccountsAndCategories";
import type { SyncTableName } from "@/features/sync/types";

import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useTransactionTemplateStore } from "@/features/finance/store/transactionTemplateStore";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTodoStore } from "@/features/todo/store/todoStore";
import { useHabitStore } from "@/features/habits/store/habitStore";
import { useHoldingStore } from "@/features/portfolio/store/holdingStore";
import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";
import { useVaultEntryStore } from "@/features/vault/store/vaultEntryStore";
import { useWorkoutExerciseStore } from "@/features/workouts/store/workoutExerciseStore";
import { useWorkoutEntryStore } from "@/features/workouts/store/workoutEntryStore";
import { useNetWorthItemStore } from "@/features/finance/store/netWorthItemStore";
import { useNetWorthSnapshotStore } from "@/features/finance/store/netWorthSnapshotStore";
import { useSubscriptionStore } from "@/features/finance/store/subscriptionStore";
import { useBudgetPeriodSnapshotStore } from "@/features/finance/store/budgetPeriodSnapshotStore";

const SYNCED_TABLES: SyncTableName[] = [
  "transactions",
  "accounts",
  "categories",
  "recipientProfiles",
  "budgets",
  "goals",
  "transactionTemplates",
  "trades",
  "todos",
  "habits",
  "holdings",
  "calendarEvents",
  "scheduleItems",
  "goalMilestoneEvents",
  "vaultEntries",
  "workoutExercises",
  "workoutEntries",
  "netWorthItems",
  "netWorthSnapshots",
  "subscriptions",
  "budgetPeriodSnapshots",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function localTable(name: SyncTableName): any {
  return db.table(name);
}

async function getSyncState(key: string): Promise<string | null> {
  const row = await db.syncState.get(key);
  return row?.value ?? null;
}

async function setSyncState(key: string, value: string) {
  await db.syncState.put({ key, value });
}

// Records created before the sync feature existed have no syncId/updatedAt
// at all, so they'd otherwise be silently invisible to push/pull. Stamp any
// stragglers in place before every push — cheap once they're all stamped.
async function backfillSyncMeta(table: SyncTableName) {
  const dexieTable = localTable(table);
  const unstamped = await dexieTable.filter((row: { syncId?: string }) => !row.syncId).toArray();

  for (const row of unstamped) {
    await dexieTable.put(withSyncMeta(row));
  }
}

async function pushTable(userId: string, table: SyncTableName) {
  await backfillSyncMeta(table);

  const lastPushedKey = `push:${table}`;
  const lastPushed = await getSyncState(lastPushedKey);

  const rows = lastPushed
    ? await localTable(table).where("updatedAt").aboveOrEqual(lastPushed).toArray()
    : await localTable(table).toArray();

  const toSync = rows.filter((row: { syncId?: string }) => row.syncId);

  if (toSync.length > 0) {
    const payload = toSync.map((row: { syncId?: string; updatedAt?: string }) => ({
      id: row.syncId,
      table_name: table,
      user_id: userId,
      data: row,
      updated_at: row.updatedAt,
      deleted_at: null,
    }));

    const { error } = await supabase!.from("synced_records").upsert(payload, { onConflict: "id,table_name" });
    if (error) throw error;
  }

  const newest = rows.reduce(
    (max: string, row: { updatedAt?: string }) => (row.updatedAt && row.updatedAt > max ? row.updatedAt : max),
    lastPushed ?? ""
  );
  if (newest) await setSyncState(lastPushedKey, newest);
}

async function pushTombstones(userId: string) {
  const tombstones = await db.syncTombstones.toArray();
  if (tombstones.length === 0) return;

  // Unlike the entity tables, nothing has deduped this one before —
  // recordTombstone() now guards against creating new duplicates, but
  // older ones from before that guard existed (e.g. the same item deleted
  // twice across sessions) could still be sitting here. Keep only the
  // latest per (table, syncId) so this single combined upsert never
  // proposes the same (id, table_name) twice, which Postgres rejects
  // outright.
  const latestByKey = new Map<string, (typeof tombstones)[number]>();
  for (const t of tombstones) {
    const key = `${t.table}:${t.syncId}`;
    const current = latestByKey.get(key);
    if (!current || t.deletedAt > current.deletedAt) latestByKey.set(key, t);
  }

  const payload = [...latestByKey.values()].map((t) => ({
    id: t.syncId,
    table_name: t.table,
    user_id: userId,
    data: {},
    updated_at: t.deletedAt,
    deleted_at: t.deletedAt,
  }));

  const { error } = await supabase!.from("synced_records").upsert(payload, { onConflict: "id,table_name" });
  if (error) throw error;

  await db.syncTombstones.bulkDelete(tombstones.map((t) => t.id!));
}

// Returns whether this table actually received any rows this pass — lets
// the caller skip refreshing a store whose underlying data never changed,
// rather than blindly reloading and re-rendering every store on every pass
// (see runFullSync).
async function pullTable(userId: string, table: SyncTableName): Promise<boolean> {
  const lastPulledKey = `pull:${table}`;
  const lastPulled = await getSyncState(lastPulledKey);

  let query = supabase!
    .from("synced_records")
    .select("*")
    .eq("user_id", userId)
    .eq("table_name", table)
    .order("updated_at", { ascending: true });

  if (lastPulled) query = query.gte("updated_at", lastPulled);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return false;

  const dexieTable = localTable(table);

  // A row can be deleted locally *during* this same sync pass — after this
  // pass's own pushTombstones() already ran (so the deletion hasn't reached
  // the server yet) but before this pass reaches this table's pull step.
  // Without this check, the still-undeleted copy just read from the server
  // would look like a legitimate remote row and get re-added here, silently
  // resurrecting something the user just deleted moments ago.
  const pendingTombstoneSyncIds = new Set(
    (await db.syncTombstones.where("table").equals(table).toArray()).map((t) => t.syncId)
  );

  // A row just received via pull — never locally edited on this device —
  // must not look "due to push" on this device's own next pass. pushTable()
  // sends anything with updatedAt >= this device's own push cursor, and a
  // pulled row's updatedAt (the editing device's timestamp) can easily be
  // newer than that cursor if this device hasn't pushed anything since.
  // Without this, this device would redundantly re-push its now-identical
  // copy of a row it never touched — and if another device edits (or
  // deletes) that same row in the gap before this device's next push, the
  // redundant push silently overwrites the newer edit/deletion, since the
  // upsert replaces the whole row unconditionally. Far more likely to
  // actually collide at a fast sync interval than the original 30s one.
  let maxAppliedUpdatedAt: string | undefined;

  for (const remoteRow of data) {
    const existing = await dexieTable.where("syncId").equals(remoteRow.id).first();

    if (remoteRow.deleted_at || pendingTombstoneSyncIds.has(remoteRow.id)) {
      if (existing) await dexieTable.delete(existing.id);
      continue;
    }

    // Guards against a corrupted/malformed remote row (a partial write, or
    // some future incompatible shape) writing garbage into local Dexie —
    // every other write path (forms, CSV import) already validates before
    // persisting; this was the one that didn't. Deliberately NOT full
    // per-table Zod schema validation: this engine is generic across every
    // SYNCED_TABLES entry with no per-table schema wired in, and a strict
    // schema check risks silently *dropping* a legitimately-shaped row
    // from a slightly different app version — worse than today's behavior
    // for a personal finance app. Only the unambiguous case is rejected:
    // not an object at all (see the "opaque blob" test above for why this
    // stays this shallow — the engine must not assume more about row shape
    // than syncId/updatedAt at the top level).
    if (remoteRow.data === null || typeof remoteRow.data !== "object" || Array.isArray(remoteRow.data)) {
      console.warn(`Sync: skipping malformed row for "${table}" (syncId ${remoteRow.id}) — data is not an object`);
      continue;
    }

    if (existing) {
      const localUpdatedAt = (existing as { updatedAt?: string }).updatedAt;
      const remoteUpdatedAt = typeof remoteRow.data.updatedAt === "string" ? remoteRow.data.updatedAt : undefined;

      // Never let an older remote copy silently clobber a newer local
      // edit — can happen if this device's own push for this table failed
      // earlier in the same pass (see runFullSync's per-step error
      // isolation), or a rare cross-device timing race. Skip the write —
      // the local edit stays as-is, and goes out on this device's next
      // successful push.
      if (localUpdatedAt && remoteUpdatedAt && remoteUpdatedAt < localUpdatedAt) {
        continue;
      }

      await dexieTable.put({ ...remoteRow.data, id: existing.id });
    } else {
      const { id: _localId, ...rest } = remoteRow.data;
      await dexieTable.add(rest);
    }

    const rowUpdatedAt = remoteRow.data?.updatedAt;
    if (typeof rowUpdatedAt === "string" && (!maxAppliedUpdatedAt || rowUpdatedAt > maxAppliedUpdatedAt)) {
      maxAppliedUpdatedAt = rowUpdatedAt;
    }
  }

  const newest = data[data.length - 1].updated_at as string;
  await setSyncState(lastPulledKey, newest);

  if (maxAppliedUpdatedAt) {
    const lastPushedKey = `push:${table}`;
    const lastPushed = await getSyncState(lastPushedKey);
    // Nudged 1ms past the pulled row's own updatedAt, not set to the exact
    // same value — pushTable's cursor comparison is deliberately inclusive
    // (>=), so a row sharing the watermark exactly would still match it and
    // get re-pushed on the very next pass, and again every pass after that
    // (since re-pushing an unchanged row just re-sets the watermark to the
    // same value again).
    let nudged = new Date(new Date(maxAppliedUpdatedAt).getTime() + 1).toISOString();

    // This nudge is a single per-table watermark, not a per-row marker — it
    // can't tell "this specific row is now in sync" apart from "everything
    // with an earlier updatedAt is already pushed". If this device also has
    // its own local, never-yet-pushed row whose updatedAt happens to be
    // *earlier* than the row(s) just pulled above (e.g. it was written
    // moments before the other device's write reached this device mid-pass),
    // nudging past it would silently exclude it from every future push,
    // since the cursor only ever advances. Cap the nudge at the oldest such
    // still-pending row instead — a redundant re-push of an unmodified
    // pulled row next pass is harmless (see above); silently losing a real
    // pending push forever is not. Mirrors pushTable's own "no cursor yet"
    // branch: with no lastPushed at all (this device's very first sync),
    // every local row is potentially pending, not just ones above a cursor.
    const pending = lastPushed
      ? await localTable(table).where("updatedAt").aboveOrEqual(lastPushed).toArray()
      : await localTable(table).toArray();
    const pulledSyncIds = new Set(data.map((r) => r.id));
    for (const row of pending as { syncId?: string; updatedAt?: string }[]) {
      if (!row.syncId || !row.updatedAt || pulledSyncIds.has(row.syncId)) continue;
      if (row.updatedAt < nudged) nudged = row.updatedAt;
    }

    if (!lastPushed || nudged > lastPushed) {
      await setSyncState(lastPushedKey, nudged);
    }
  }

  return true;
}

// Belt-and-suspenders against concurrent sync passes (e.g. a manual "Sync
// Now" overlapping the periodic background sync on a slow connection):
// `syncId` has no unique constraint at the Dexie schema level, so a race
// between two overlapping pulls checking "does this row already exist
// locally?" can each miss the other's not-yet-committed insert and both add
// their own copy. Runs every sync pass — cheap (local reads/deletes only,
// no network) — and folds any duplicates down to the oldest (first
// inserted) copy of each syncId. Returns which tables actually had a
// duplicate removed, for the same reason pullTable reports whether it
// wrote anything.
async function dedupeSyncedTables(): Promise<Set<SyncTableName>> {
  const changed = new Set<SyncTableName>();

  for (const table of SYNCED_TABLES) {
    const dexieTable = localTable(table);
    const rows: { id?: number; syncId?: string }[] = await dexieTable.toArray();

    const bySyncId = new Map<string, { id?: number }[]>();
    for (const row of rows) {
      if (!row.syncId) continue;
      const group = bySyncId.get(row.syncId) ?? [];
      group.push(row);
      bySyncId.set(row.syncId, group);
    }

    for (const group of bySyncId.values()) {
      if (group.length <= 1) continue;

      const duplicateIds = [...group]
        .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
        .slice(1)
        .map((row) => row.id!);

      await dexieTable.bulkDelete(duplicateIds);
      changed.add(table);
    }
  }

  return changed;
}

// One-time repair for local push-cursor corruption left behind by a since-
// fixed pullTable() nudge bug: older builds could nudge a device's own
// push:<table> cursor past a local row that was never actually pushed,
// silently excluding it from every sync pass thereafter with no error ever
// surfaced (see the "still pushes an unrelated not-yet-pushed local row..."
// test below, which proves the nudge itself no longer does this). This just
// repairs cursors that were already corrupted by it before that fix shipped.
// Clearing a push cursor only makes the next pass re-consider every local
// row for push — re-upserting an already-synced row is a harmless no-op
// (same data, same updated_at), so this is safe to run unconditionally.
// Gated by a flag so it only ever runs once per device, not on every pass.
async function repairStuckPushCursorsOnce() {
  const flagKey = "migration:clearedPushCursors:v1";
  if (await getSyncState(flagKey)) return;

  for (const table of SYNCED_TABLES) {
    await db.syncState.delete(`push:${table}`);
  }
  await setSyncState(flagKey, "true");
}

const STORE_REFRESHERS: Record<SyncTableName, () => Promise<void>> = {
  transactions: () => useTransactionStore.getState().loadTransactions(),
  accounts: () => useAccountStore.getState().loadAccounts(),
  categories: () => useCategoryStore.getState().loadCategories(),
  recipientProfiles: () => useRecipientProfileStore.getState().loadProfiles(),
  budgets: () => useBudgetStore.getState().loadBudgets(),
  goals: () => useGoalStore.getState().loadGoals(),
  transactionTemplates: () => useTransactionTemplateStore.getState().loadTemplates(),
  trades: () => useTradeStore.getState().loadTrades(),
  todos: () => useTodoStore.getState().loadTodos(),
  habits: () => useHabitStore.getState().loadHabits(),
  holdings: () => useHoldingStore.getState().loadHoldings(),
  // No UI reads this table anymore (Calendar's UI was retired, but its
  // existing data is deliberately still synced — see the Life Schedule
  // refactor plan) — the generic pullTable() logic already writes the
  // pulled rows straight into Dexie regardless of any Zustand store, so
  // there's nothing left to refresh here.
  calendarEvents: async () => {},
  scheduleItems: () => useScheduleItemStore.getState().loadItems(),
  goalMilestoneEvents: () => useGoalMilestoneEventStore.getState().loadEvents(),
  vaultEntries: () => useVaultEntryStore.getState().loadEntries(),
  workoutExercises: () => useWorkoutExerciseStore.getState().loadExercises(),
  workoutEntries: () => useWorkoutEntryStore.getState().loadEntries(),
  netWorthItems: () => useNetWorthItemStore.getState().loadItems(),
  netWorthSnapshots: () => useNetWorthSnapshotStore.getState().loadSnapshots(),
  subscriptions: () => useSubscriptionStore.getState().loadSubscriptions(),
  budgetPeriodSnapshots: () => useBudgetPeriodSnapshotStore.getState().loadSnapshots(),
};

// Only reloads (and re-renders) stores whose underlying table actually
// received a change this pass. Local user actions already update their own
// store directly at the time of the action — this exists purely to pick up
// remote changes pulled from another device, or dedup cleanup. Reloading
// (and thus re-rendering every subscribed component for) all 12 stores on
// every pass regardless of whether anything changed is what made a fast
// periodic interval feel janky.
async function refreshChangedStores(changedTables: Set<SyncTableName>) {
  await Promise.all([...changedTables].map((table) => STORE_REFRESHERS[table]()));
}

// Each step runs independently — one table's push/pull failing (e.g. a
// flaky mobile connection mid-sync) must not prevent tombstones or any
// other table from being attempted. Otherwise a single bad table blocks
// every step after it in the same pass, including deletions, which then
// silently never reach the other device. Errors are collected and
// re-thrown at the end so the caller still surfaces that something failed.
export async function runFullSync(userId: string): Promise<void> {
  if (!isSyncConfigured || !supabase) return;

  const errors: unknown[] = [];
  const changedTables = new Set<SyncTableName>();

  async function attempt(step: () => Promise<void>) {
    try {
      await step();
    } catch (err) {
      errors.push(err);
    }
  }

  async function attemptReturning<T>(step: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await step();
    } catch (err) {
      errors.push(err);
      return fallback;
    }
  }

  await attempt(() => repairStuckPushCursorsOnce());

  // Also runs before push, not just after pull — a duplicate syncId left
  // over locally (e.g. from two tabs racing, or any other cause) would
  // otherwise make every future push fail forever with Postgres's "ON
  // CONFLICT DO UPDATE command cannot affect row a second time", since the
  // same still-duplicated row gets re-pushed again on every pass before
  // this cleanup ever runs.
  (await attemptReturning(() => dedupeSyncedTables(), new Set<SyncTableName>())).forEach((t) =>
    changedTables.add(t)
  );

  for (const table of SYNCED_TABLES) {
    await attempt(() => pushTable(userId, table));
  }

  await attempt(() => pushTombstones(userId));

  for (const table of SYNCED_TABLES) {
    const hadChanges = await attemptReturning(() => pullTable(userId, table), false);
    if (hadChanges) changedTables.add(table);
  }

  (await attemptReturning(() => dedupeSyncedTables(), new Set<SyncTableName>())).forEach((t) =>
    changedTables.add(t)
  );

  // Two devices that each seed their own default accounts/categories before
  // ever syncing end up with separate name-duplicate records (their own
  // "Cash", their own "Food") that dedupeSyncedTables() can't catch — it
  // only matches by syncId, and these are genuinely different syncIds for
  // the same real-world thing (see dedupeAccountsAndCategories.ts). Runs
  // after pull, once any such records from another device have actually
  // landed locally; cheap when there's nothing to merge (a handful of local
  // reads), and only does real work on the rare pass that finds one.
  const { accountsMerged, categoriesMerged } = await attemptReturning(
    () => dedupeAccountsAndCategories(),
    { accountsMerged: 0, categoriesMerged: 0 }
  );
  if (accountsMerged > 0) {
    changedTables.add("accounts");
    changedTables.add("transactions");
  }
  if (categoriesMerged > 0) {
    changedTables.add("categories");
    changedTables.add("transactions");
  }

  await refreshChangedStores(changedTables);

  if (errors.length > 0) throw errors[0];
}
