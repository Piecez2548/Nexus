import { lastNMonthRanges } from "@/features/finance/utils/cashFlowMath";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import { computeBudgetSpend } from "@/features/finance/utils/budgetStatus";
import type { Budget, RecipientProfile, Transaction } from "@/features/finance/types";

export type CategoryDetailRecommendationKey = "categoryHasBudget" | "categoryNoBudgetSuggestion";

export interface CategoryDetailRecommendation {
  key: CategoryDetailRecommendationKey;
  params: Record<string, string | number>;
}

export interface CategoryMonthlyTrendPoint {
  monthKey: string;
  amount: number;
}

export interface CategoryTopMerchant {
  alias: string;
  transactionCount: number;
  totalAmount: number;
}

export interface CategoryDetailResult {
  category: string;
  totalSpent: number;
  transactionCount: number;
  averagePerPurchase: number;
  averagePerDay: number;
  monthlyTrend: CategoryMonthlyTrendPoint[];
  // Most-recent-first, scoped to the same trailing window as every other
  // field here.
  transactions: Transaction[];
  topMerchant: CategoryTopMerchant | null;
  budget: Budget | null;
  recommendation: CategoryDetailRecommendation | null;
  potentialSavings: number | null;
}

// Matches this feature's existing 6-month convention elsewhere (subscription
// detection, merchant monthly trend) — wide enough to show a real trend line,
// unlike the 3-month window most other behaviorAnalysis signals use.
const CATEGORY_DETAIL_WINDOW_MONTHS = 6;

// A category with no budget has nothing to compare against, so the
// suggested cap is a heuristic fraction of its trailing average monthly
// spend — mirrors recommendations.ts's own REDUCTION_ASSUMPTION, duplicated
// here since that constant is private to its module and the two heuristics
// are conceptually independent (one re-derivation away from drifting apart
// is an acceptable cost for not reaching into another analyzer's internals).
const NO_BUDGET_REDUCTION_ASSUMPTION = 0.3;

function computeCategoryTopMerchant(categoryTransactions: Transaction[], recipientProfiles: RecipientProfile[]): CategoryTopMerchant | null {
  const aliasByKey = new Map(recipientProfiles.map((p) => [p.recipientKey, p.alias]));
  const totals = new Map<string, CategoryTopMerchant>();

  for (const t of categoryTransactions) {
    if (!t.recipient) continue;
    const existing = totals.get(t.recipient);
    const alias = aliasByKey.get(t.recipient) ?? t.recipient;
    totals.set(t.recipient, {
      alias,
      transactionCount: (existing?.transactionCount ?? 0) + 1,
      totalAmount: (existing?.totalAmount ?? 0) + t.amount,
    });
  }

  let top: CategoryTopMerchant | null = null;
  for (const entry of totals.values()) {
    if (!top || entry.totalAmount > top.totalAmount) top = entry;
  }
  return top;
}

export function analyzeCategoryDetail(
  transactions: Transaction[],
  recipientProfiles: RecipientProfile[],
  budgets: Budget[],
  category: string,
  now = new Date()
): CategoryDetailResult {
  const months = lastNMonthRanges(CATEGORY_DETAIL_WINDOW_MONTHS, now);
  const windowRange = { start: months[0].range.start, end: months[months.length - 1].range.end };

  const categoryTransactions = transactions
    .filter((t) => t.type === "expense" && t.category === category && isDateWithinRange(t.date, windowRange))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const totalSpent = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
  const transactionCount = categoryTransactions.length;
  const averagePerPurchase = transactionCount > 0 ? totalSpent / transactionCount : 0;

  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((now.getTime() - windowRange.start.getTime()) / msPerDay));
  const averagePerDay = totalSpent / totalDays;

  const monthlyTrend: CategoryMonthlyTrendPoint[] = months.map((m) => ({
    monthKey: m.monthKey,
    amount: transactions
      .filter((t) => t.type === "expense" && t.category === category && isDateWithinRange(t.date, m.range))
      .reduce((sum, t) => sum + t.amount, 0),
  }));

  const topMerchant = computeCategoryTopMerchant(categoryTransactions, recipientProfiles);
  const budget = budgets.find((b) => b.category === category) ?? null;

  let recommendation: CategoryDetailRecommendation | null = null;
  let potentialSavings: number | null = null;

  if (budget) {
    const { spent, status } = computeBudgetSpend(budget, transactions, now);
    recommendation = { key: "categoryHasBudget", params: { category, budgetAmount: budget.amount, spent } };
    potentialSavings = status === "over" ? spent - budget.amount : null;
  } else if (totalSpent > 0) {
    const averageMonthlySpend = totalSpent / CATEGORY_DETAIL_WINDOW_MONTHS;
    const suggestedCap = Math.round(averageMonthlySpend * (1 - NO_BUDGET_REDUCTION_ASSUMPTION));
    recommendation = { key: "categoryNoBudgetSuggestion", params: { category, suggestedCap } };
    potentialSavings = Math.round(averageMonthlySpend * NO_BUDGET_REDUCTION_ASSUMPTION);
  }

  return {
    category,
    totalSpent,
    transactionCount,
    averagePerPurchase,
    averagePerDay,
    monthlyTrend,
    transactions: categoryTransactions,
    topMerchant,
    budget,
    recommendation,
    potentialSavings,
  };
}
