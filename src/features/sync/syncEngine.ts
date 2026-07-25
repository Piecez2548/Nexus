import { db } from "@/database/db";
import { supabase, isSyncConfigured } from "@/lib/supabaseClient";
import { withSyncMeta } from "@/utils/syncMeta";
import type { SyncTableName } from "@/features/sync/types";

import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useTransactionTemplateStore } from "@/features/finance/store/transactionTemplateStore";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTodoStore } from "@/features/todo/store/todoStore";

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

  const payload = tombstones.map((t) => ({
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

async function pullTable(userId: string, table: SyncTableName) {
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
  if (!data || data.length === 0) return;

  const dexieTable = localTable(table);

  for (const remoteRow of data) {
    const existing = await dexieTable.where("syncId").equals(remoteRow.id).first();

    if (remoteRow.deleted_at) {
      if (existing) await dexieTable.delete(existing.id);
      continue;
    }

    if (existing) {
      await dexieTable.put({ ...remoteRow.data, id: existing.id });
    } else {
      const { id: _localId, ...rest } = remoteRow.data;
      await dexieTable.add(rest);
    }
  }

  const newest = data[data.length - 1].updated_at as string;
  await setSyncState(lastPulledKey, newest);
}

async function refreshAllStores() {
  await Promise.all([
    useTransactionStore.getState().loadTransactions(),
    useAccountStore.getState().loadAccounts(),
    useCategoryStore.getState().loadCategories(),
    useBudgetStore.getState().loadBudgets(),
    useGoalStore.getState().loadGoals(),
    useRecipientProfileStore.getState().loadProfiles(),
    useTransactionTemplateStore.getState().loadTemplates(),
    useTradeStore.getState().loadTrades(),
    useTodoStore.getState().loadTodos(),
  ]);
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

  async function attempt(step: () => Promise<void>) {
    try {
      await step();
    } catch (err) {
      errors.push(err);
    }
  }

  for (const table of SYNCED_TABLES) {
    await attempt(() => pushTable(userId, table));
  }

  await attempt(() => pushTombstones(userId));

  for (const table of SYNCED_TABLES) {
    await attempt(() => pullTable(userId, table));
  }

  await refreshAllStores();

  if (errors.length > 0) throw errors[0];
}
