import { accountRepository } from "@/features/finance/repositories/accountRepository";
import { transactionRepository } from "@/features/finance/repositories/transactionRepository";
import type { Account } from "../types";

export const accountService = {
  list: () => accountRepository.getAll(),

  create: (account: Account) => accountRepository.add(account),

  update: (id: number, account: Account) =>
    accountRepository.update(id, account),

  async remove(id: number, accountName: string) {
    const transactions = await transactionRepository.getAll();

    const inUse = transactions.some(
      (t) => t.account === accountName || t.toAccount === accountName
    );

    if (inUse) {
      throw new Error("ไม่สามารถลบบัญชีที่มีรายการอยู่ได้");
    }

    await accountRepository.remove(id);
  },

  // Reassigns every transaction using `sourceAccountName` (as either the
  // account or, for transfers, the destination account) to
  // `targetAccountName`, then removes the now-empty source account.
  async merge(
    sourceAccountId: number,
    sourceAccountName: string,
    targetAccountName: string
  ) {
    const transactions = await transactionRepository.getAll();
    const affected = transactions.filter(
      (t) => t.account === sourceAccountName || t.toAccount === sourceAccountName
    );

    await Promise.all(
      affected
        .filter((t) => t.id !== undefined)
        .map((t) =>
          transactionRepository.update(t.id as number, {
            ...t,
            account: t.account === sourceAccountName ? targetAccountName : t.account,
            toAccount: t.toAccount === sourceAccountName ? targetAccountName : t.toAccount,
          })
        )
    );

    await accountRepository.remove(sourceAccountId);
  },
};
