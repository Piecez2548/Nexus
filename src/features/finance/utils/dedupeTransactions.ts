import { groupDuplicates } from "@/features/finance/utils/dedupeAccountsAndCategories";
import { transactionService } from "@/features/finance/services/transactionService";
import type { Transaction } from "@/features/finance/types";

export interface TransactionDuplicateGroup {
  key: string;
  keep: Transaction;
  remove: Transaction[];
}

// Unlike accounts/categories (matched loosely by name, since a name match
// strongly implies "same real-world thing"), a transaction is an event —
// two genuinely separate transactions can coincidentally share an amount,
// date, and category (e.g. two ฿100 lunches on the same day). So this key
// requires every real content field to match exactly, excluding only the
// SyncMeta plumbing fields (`id`/`syncId`/`updatedAt`/`deletedAt`) that are
// expected to legitimately differ between independently-created copies of
// the same real transaction (the classic cause: the same transaction
// entered on two devices before they'd ever synced with each other).
function transactionDuplicateKey(t: Transaction): string {
  return [
    t.title.trim().toLowerCase(),
    t.amount,
    t.type,
    t.account.trim().toLowerCase(),
    (t.toAccount ?? "").trim().toLowerCase(),
    (t.category ?? "").trim().toLowerCase(),
    t.date,
    t.time ?? "",
    [...(t.tags ?? [])].sort().join(","),
    t.attachment ?? "",
    t.note ?? "",
    t.status ?? "",
    (t.recipient ?? "").trim().toLowerCase(),
    Boolean(t.favorite),
    JSON.stringify(t.recurring ?? null),
  ].join("::");
}

// Pure/read-only — computes candidate groups but deletes nothing. This is
// what powers the confirm-before-merge preview; nothing is removed until
// mergeTransactionDuplicates is explicitly called after the user confirms.
export function findTransactionDuplicates(transactions: Transaction[]): TransactionDuplicateGroup[] {
  return groupDuplicates(transactions, transactionDuplicateKey).map((group) => {
    const [keep, ...remove] = [...group].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    return { key: transactionDuplicateKey(keep), keep, remove };
  });
}

// Only ever called after the user has reviewed the preview and confirmed.
// Transactions have no dependents referencing them (unlike accounts/
// categories, which need their dependent transactions reassigned before a
// merge) — removing a duplicate is just a delete via the already-shipped
// transactionService.remove (Dexie delete + sync tombstone).
export async function mergeTransactionDuplicates(groups: TransactionDuplicateGroup[]): Promise<number> {
  let removed = 0;

  for (const group of groups) {
    for (const duplicate of group.remove) {
      if (duplicate.id === undefined) continue;
      await transactionService.remove(duplicate.id);
      removed++;
    }
  }

  return removed;
}
