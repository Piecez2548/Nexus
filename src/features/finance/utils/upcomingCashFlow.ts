import { advanceOneBillingCycle, resolveBillingAnchorDay, resolveNextBillingDate } from "@/features/finance/utils/subscriptionMath";
import { toLocalDateString } from "@/utils/localDate";
import { calculateAccountBalances, isLiabilityAccount } from "@/features/finance/utils/accountBalance";
import type { Account, Subscription, Transaction } from "@/features/finance/types";

export const UPCOMING_HORIZON_DAYS = 14;
// Bounds a daily subscription's occurrences inside the horizon (14 + margin).
const MAX_OCCURRENCES = 60;

export interface UpcomingCashFlow {
  upcomingExpense: number;
  upcomingIncome: number;
  projectedBalance: number;
}

// Deterministic look-ahead over active subscriptions only: every occurrence
// from today through `horizonDays` ahead, applied to the current overall
// balance. Past-due occurrences are not counted here -- the foreground
// due-check turns those into real transactions, which are already in
// `balance`. This is an overall figure, matching the Dashboard's Balance card;
// projectAccountShortfalls does the same per account.
export function projectUpcomingCashFlow(
  subscriptions: Subscription[],
  balance: number,
  now: Date = new Date(),
  horizonDays: number = UPCOMING_HORIZON_DAYS
): UpcomingCashFlow {
  const end = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() + horizonDays));
  let upcomingExpense = 0;
  let upcomingIncome = 0;

  for (const subscription of subscriptions) {
    if (subscription.status !== "active") continue;

    const anchor = resolveBillingAnchorDay(subscription.nextBillingDate, subscription.billingAnchorDay);
    let date = resolveNextBillingDate(subscription.nextBillingDate, subscription.billingFrequency, now, anchor);

    for (let i = 0; i < MAX_OCCURRENCES && date <= end; i++) {
      if ((subscription.kind ?? "expense") === "income") upcomingIncome += subscription.amount;
      else upcomingExpense += subscription.amount;
      date = advanceOneBillingCycle(date, subscription.billingFrequency, anchor);
    }
  }

  return { upcomingExpense, upcomingIncome, projectedBalance: balance + upcomingIncome - upcomingExpense };
}

export interface AccountShortfall {
  account: string;
  balance: number;
  upcomingExpense: number;
  projectedBalance: number;
}

// Per-account look-ahead: only subscriptions that name an account, only
// asset accounts the user opted into tracking by entering an opening balance
// (otherwise a never-configured account would read 0 and warn on every bill).
// Returns the accounts whose projected balance goes below zero.
export function projectAccountShortfalls(
  subscriptions: Subscription[],
  accounts: Account[],
  transactions: Transaction[],
  now: Date = new Date(),
  horizonDays: number = UPCOMING_HORIZON_DAYS
): AccountShortfall[] {
  const balances = calculateAccountBalances(accounts, transactions);
  const shortfalls: AccountShortfall[] = [];

  for (const account of accounts) {
    if (account.openingBalance === undefined || isLiabilityAccount(account.type)) continue;

    const own = subscriptions.filter((s) => s.account === account.name);
    const balance = balances.get(account.name)?.balance ?? 0;
    const { upcomingExpense, projectedBalance } = projectUpcomingCashFlow(own, balance, now, horizonDays);

    if (upcomingExpense > 0 && projectedBalance < 0) {
      shortfalls.push({ account: account.name, balance, upcomingExpense, projectedBalance });
    }
  }

  return shortfalls;
}
