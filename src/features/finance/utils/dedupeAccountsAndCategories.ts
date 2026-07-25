import { accountRepository } from "@/features/finance/repositories/accountRepository";
import { categoryRepository } from "@/features/finance/repositories/categoryRepository";
import { accountService } from "@/features/finance/services/accountService";
import { categoryService } from "@/features/finance/services/categoryService";
import type { Account, Category } from "@/features/finance/types";

export interface DedupeResult {
  accountsMerged: number;
  categoriesMerged: number;
}

// Two devices that each seed their own default accounts/categories before
// ever syncing end up with separate records for the same real-world thing
// (their own "Cash", their own "Food") — sync has no way to know these are
// duplicates since it only matches by syncId, not by name. Groups matches
// and folds every duplicate into the oldest (first created) one,
// reassigning its transactions rather than losing them.
function groupDuplicates<T extends { id?: number }>(items: T[], keyFn: (item: T) => string): T[][] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  return [...groups.values()].filter((group) => group.length > 1);
}

export async function dedupeAccountsAndCategories(): Promise<DedupeResult> {
  const accounts = await accountRepository.getAll();
  const categories = await categoryRepository.getAll();

  // Grouped by name only — an account's `type` is just metadata about the
  // same real-world account, not a second identity, and older/legacy rows
  // can have a missing or mismatched type that would otherwise (wrongly)
  // keep them from being recognized as the same account.
  let accountsMerged = 0;
  for (const group of groupDuplicates<Account>(accounts, (a) => a.name.trim().toLowerCase())) {
    const [canonical, ...duplicates] = [...group].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

    for (const duplicate of duplicates) {
      if (duplicate.id === undefined) continue;
      await accountService.merge(duplicate.id, duplicate.name, canonical.name);
      accountsMerged++;
    }
  }

  // Categories, on the other hand, can legitimately share a name across
  // income vs. expense (e.g. "Investment"), so type is part of their identity.
  let categoriesMerged = 0;
  for (const group of groupDuplicates<Category>(categories, (c) => `${c.name.trim().toLowerCase()}::${c.type}`)) {
    const [canonical, ...duplicates] = [...group].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

    for (const duplicate of duplicates) {
      if (duplicate.id === undefined) continue;
      await categoryService.merge(duplicate.id, duplicate.name, canonical.name);
      categoriesMerged++;
    }
  }

  return { accountsMerged, categoriesMerged };
}
