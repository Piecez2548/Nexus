// Shared domain-spending aggregation — reused by food/coffee/transport
// (keyword-matched, via analyzeDomainSpending) and shopping (category-name
// matched, via analyzeDomainSpendingByPredicate directly, since no keyword
// list exists for it). One aggregation engine, two matching strategies —
// not two copies of the trend/top-merchant computation.

import { lastNMonthRanges, lastNWeekRanges } from "@/features/finance/utils/cashFlowMath";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import { matchesKeywordFlag, recipientAliasLookup } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { Transaction, RecipientProfile } from "@/features/finance/types";
import type { DomainSpendingAnalysis } from "@/features/finance/aiAnalytics/engine/behavior/types";

const MONTHLY_WINDOW_MONTHS = 6;
const WEEKLY_WINDOW_WEEKS = 8;

export function analyzeDomainSpendingByPredicate(transactions: Transaction[], matcher: (t: Transaction) => boolean, recipientProfiles: RecipientProfile[], now: Date): DomainSpendingAnalysis {
  const aliasByKey = recipientAliasLookup(recipientProfiles);
  const matches = transactions.filter((t) => t.type === "expense" && matcher(t));

  const totalSpent = matches.reduce((sum, t) => sum + t.amount, 0);
  const transactionCount = matches.length;
  const averagePerVisit = transactionCount > 0 ? totalSpent / transactionCount : 0;

  const monthRanges = lastNMonthRanges(MONTHLY_WINDOW_MONTHS, now);
  const windowStart = monthRanges[0].range.start;
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((now.getTime() - windowStart.getTime()) / msPerDay));
  const windowSpent = matches.filter((t) => isDateWithinRange(t.date, { start: windowStart, end: now })).reduce((sum, t) => sum + t.amount, 0);
  const averagePerDay = windowSpent / totalDays;

  const monthlyTrend = monthRanges.map((m) => ({
    periodKey: m.monthKey,
    amount: matches.filter((t) => isDateWithinRange(t.date, m.range)).reduce((sum, t) => sum + t.amount, 0),
  }));

  const weeklyTrend = lastNWeekRanges(WEEKLY_WINDOW_WEEKS, now).map((w) => ({
    periodKey: w.weekStart,
    amount: matches.filter((t) => isDateWithinRange(t.date, w.range)).reduce((sum, t) => sum + t.amount, 0),
  }));

  const merchantTotals = new Map<string, number>();
  for (const t of matches) {
    if (!t.recipient) continue;
    const alias = aliasByKey.get(t.recipient) ?? t.recipient;
    merchantTotals.set(alias, (merchantTotals.get(alias) ?? 0) + t.amount);
  }
  let topMerchant: { alias: string; totalAmount: number } | null = null;
  for (const [alias, totalAmount] of merchantTotals) {
    if (!topMerchant || totalAmount > topMerchant.totalAmount) topMerchant = { alias, totalAmount };
  }

  return { totalSpent, transactionCount, averagePerVisit, averagePerDay, monthlyTrend, weeklyTrend, topMerchant };
}

export function analyzeDomainSpending(transactions: Transaction[], keywords: readonly string[], recipientProfiles: RecipientProfile[], now: Date): DomainSpendingAnalysis {
  const aliasByKey = recipientAliasLookup(recipientProfiles);
  return analyzeDomainSpendingByPredicate(transactions, (t) => matchesKeywordFlag(t, keywords, aliasByKey), recipientProfiles, now);
}
