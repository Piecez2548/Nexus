import type { Account, AccountType, Transaction } from "@/features/finance/types";

const LIABILITY_TYPES: ReadonlySet<AccountType> = new Set(["credit_card", "loan"]);

export function isLiabilityAccount(type: AccountType): boolean {
  return LIABILITY_TYPES.has(type);
}

export interface AccountBalance {
  // Signed money position: positive means money held, negative means money owed.
  balance: number;
  // Amount owed for credit_card / loan accounts, otherwise null.
  owed: number | null;
}

// Per-account balance from the opening balance plus completed transactions.
// income adds, expense subtracts, transfer moves money from `account` to
// `toAccount`, refund adds. adjustment has no direction and pending
// transactions have not settled, so both are ignored. For liability accounts
// the opening balance is the amount owed.
export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
): Map<string, AccountBalance> {
  const balances = new Map<string, number>();
  for (const account of accounts) {
    const opening = account.openingBalance ?? 0;
    balances.set(account.name, isLiabilityAccount(account.type) ? -opening : opening);
  }

  const apply = (name: string | undefined, delta: number) => {
    if (name === undefined || !balances.has(name)) return;
    balances.set(name, (balances.get(name) ?? 0) + delta);
  };

  for (const t of transactions) {
    if (t.status === "pending") continue;
    if (t.type === "income" || t.type === "refund") apply(t.account, t.amount);
    else if (t.type === "expense") apply(t.account, -t.amount);
    else if (t.type === "transfer") {
      apply(t.account, -t.amount);
      apply(t.toAccount, t.amount);
    }
  }

  const result = new Map<string, AccountBalance>();
  for (const account of accounts) {
    const balance = balances.get(account.name) ?? 0;
    result.set(account.name, {
      balance,
      owed: isLiabilityAccount(account.type) ? -balance : null,
    });
  }
  return result;
}
