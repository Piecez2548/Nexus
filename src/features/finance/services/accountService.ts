import { accountRepository } from "@/features/finance/repositories/accountRepository";
import { transactionRepository } from "@/features/finance/repositories/transactionRepository";
import { translate } from "@/i18n/useTranslation";
import type { Account, Transaction } from "../types";

export const accountService = {
  list: () => accountRepository.getAll(),

  create: (account: Account) => accountRepository.add(account),

  // Transactions reference an account by its plain name string, not an id
  // (see docs/DATABASE_SCHEMA.md) -- remove() and merge() both already
  // account for this (a delete-guard, and an explicit reassignment cascade,
  // respectively), but a plain rename via this Edit form previously had
  // none: every transaction still holding the old name would silently
  // disappear from that account's filtered views and balance the moment
  // the name changed. Reuses merge()'s exact reassignment logic (same
  // order: transactions first, then the account's own row last, matching
  // merge()'s established non-atomic sequencing for this exact class of
  // rename-cascade operation) whenever the name actually changes.
  async update(id: number, account: Account) {
    const existing = (await accountRepository.getAll()).find((a) => a.id === id);

    if (existing !== undefined && existing.name !== account.name) {
      const transactions = await transactionRepository.getAll();
      await Promise.all(
        transactions
          .filter((t) => t.account === existing.name || t.toAccount === existing.name)
          .map((t) => {
            const next: Transaction = {
              ...t,
              account: t.account === existing.name ? account.name : t.account,
              toAccount: t.toAccount === existing.name ? account.name : t.toAccount,
            };
            return next.id !== undefined ? transactionRepository.update(next.id, next) : undefined;
          })
      );
    }

    return accountRepository.update(id, account);
  },

  async remove(id: number, accountName: string) {
    const transactions = await transactionRepository.getAll();

    const inUse = transactions.some(
      (t) => t.account === accountName || t.toAccount === accountName
    );

    if (inUse) {
      throw new Error(translate("accounts.deleteInUseError"));
    }

    await accountRepository.remove(id);
  },

  // Reassigns every transaction using `sourceAccountName` (as either the
  // account or, for transfers, the destination account) to
  // `targetAccountName`, then removes the now-empty source account.
  //
  // Accepts an optional pre-fetched transaction list so a caller merging
  // several duplicates in one pass (dedupeAccountsAndCategories.ts) can
  // fetch the full table once instead of once per merge -- a real N+1 on
  // sync's background dedupe path. Returns the updated list so that same
  // caller can thread it into the *next* merge call in the same pass: a
  // transaction whose account and toAccount each match a *different*
  // duplicate-flagged account would otherwise have this call's fix
  // silently undone by a later call still working from the original,
  // stale snapshot.
  async merge(
    sourceAccountId: number,
    sourceAccountName: string,
    targetAccountName: string,
    transactions?: Transaction[]
  ): Promise<Transaction[]> {
    const list = transactions ?? (await transactionRepository.getAll());

    const updated = await Promise.all(
      list.map(async (t) => {
        if (t.account !== sourceAccountName && t.toAccount !== sourceAccountName) return t;

        const next: Transaction = {
          ...t,
          account: t.account === sourceAccountName ? targetAccountName : t.account,
          toAccount: t.toAccount === sourceAccountName ? targetAccountName : t.toAccount,
        };
        if (next.id !== undefined) await transactionRepository.update(next.id, next);
        return next;
      })
    );

    await accountRepository.remove(sourceAccountId);
    return updated;
  },
};
