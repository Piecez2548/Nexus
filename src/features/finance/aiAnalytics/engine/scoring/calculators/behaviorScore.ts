// Behavior calculator — Restaurant Frequency (eatingOut flag), Coffee
// Purchases, Weekend Spending, Night Spending, Impulse Purchases, and
// Subscription Usage, each scored as a share of a comparable total (expense
// for the first five, income for subscriptions — there's no "usage" signal
// to measure subscriptions against, only cost, documented here rather than
// fabricated). Reuses behaviorAnalysis.flags/.impulsePurchases/.subscriptions
// verbatim (all already scoped to the same trailing 3-month window) instead
// of recomputing anything.

import type { CategoryScoreResult, ScoreContext, ScoreMessage } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { ScoreThresholds } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { BehaviorFlag } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

const NS = "aiAnalytics.financialHealthScore.behavior";
const RECENT_WINDOW_MONTHS = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// share = amount as a percentage of `total` — the higher the share, the
// lower the score, bottoming out at 0 once share reaches
// `fullPenaltyPercent`. `total <= 0` with a positive amount is the worst
// case (spending against no comparable base); `total <= 0` with no amount
// at all is a clean 100 (nothing to penalize).
function scoreShare(amount: number, total: number, fullPenaltyPercent: number): number {
  if (total <= 0) return amount > 0 ? 0 : 100;
  const sharePercent = (amount / total) * 100;
  return clamp(100 - (sharePercent / fullPenaltyPercent) * 100, 0, 100);
}

function flagFactor(flag: BehaviorFlag | undefined, score: number, positiveKey: string, negativeKey: string): { positive?: ScoreMessage; negative?: ScoreMessage } {
  if (!flag || flag.transactionCount === 0) return {};
  if (score >= 80) return { positive: { key: positiveKey, params: { amount: Math.round(flag.totalAmount) } } };
  if (score < 50) return { negative: { key: negativeKey, params: { amount: Math.round(flag.totalAmount), count: flag.transactionCount } } };
  return {};
}

export function calculateBehaviorScore(context: ScoreContext, weight: number, thresholds: ScoreThresholds["behavior"]): CategoryScoreResult {
  const { flags, impulsePurchases, subscriptions } = context.behaviorAnalysis;
  const recentMonths = context.cashFlowAnalysis.monthlyTrend.slice(-RECENT_WINDOW_MONTHS);
  const recentExpense = recentMonths.reduce((sum, m) => sum + m.expense, 0);
  const recentIncome = recentMonths.reduce((sum, m) => sum + m.income, 0);

  const eatingOut = flags.find((f) => f.key === "eatingOut");
  const coffee = flags.find((f) => f.key === "coffee");
  const weekend = flags.find((f) => f.key === "weekendSpending");
  const night = flags.find((f) => f.key === "nightSpending");
  const impulseTotal = impulsePurchases.reduce((sum, p) => sum + p.amount, 0);
  const subscriptionTotal = subscriptions.reduce((sum, s) => sum + s.averageAmount, 0);

  const hasAnyActivity = recentExpense > 0 || recentIncome > 0;
  if (!hasAnyActivity) {
    return {
      category: "behavior",
      score: null,
      weight,
      explanation: { reason: { key: `${NS}.reason.noData`, params: {} }, positiveFactors: [], negativeFactors: [], improvementSuggestions: [] },
    };
  }

  const eatingOutScore = scoreShare(eatingOut?.totalAmount ?? 0, recentExpense, thresholds.discretionaryShareFullPenaltyPercent);
  const coffeeScore = scoreShare(coffee?.totalAmount ?? 0, recentExpense, thresholds.discretionaryShareFullPenaltyPercent);
  const weekendScore = scoreShare(weekend?.totalAmount ?? 0, recentExpense, thresholds.discretionaryShareFullPenaltyPercent);
  const impulseScore = scoreShare(impulseTotal, recentExpense, thresholds.discretionaryShareFullPenaltyPercent);
  const subscriptionScore = scoreShare(subscriptionTotal, recentIncome, thresholds.subscriptionShareFullPenaltyPercent);

  // Night spending is excluded from the average entirely (not scored as
  // 100) when there's no reliable time-of-day data — most transactions
  // don't carry an optional `time`, so "unavailable" is the common case,
  // not an edge case.
  const nightScore = night && night.dataQuality !== "unavailable" ? scoreShare(night.totalAmount, recentExpense, thresholds.discretionaryShareFullPenaltyPercent) : null;

  const components = [eatingOutScore, coffeeScore, weekendScore, nightScore, impulseScore, subscriptionScore].filter((s): s is number => s !== null);
  const score = components.reduce((sum, s) => sum + s, 0) / components.length;

  const positiveFactors: ScoreMessage[] = [];
  const negativeFactors: ScoreMessage[] = [];
  const improvementSuggestions: ScoreMessage[] = [];

  const eatingOutFactor = flagFactor(eatingOut, eatingOutScore, `${NS}.positive.eatingOutControlled`, `${NS}.negative.eatingOutHigh`);
  const coffeeFactor = flagFactor(coffee, coffeeScore, `${NS}.positive.coffeeControlled`, `${NS}.negative.coffeeHigh`);
  const weekendFactor = flagFactor(weekend, weekendScore, `${NS}.positive.weekendControlled`, `${NS}.negative.weekendHigh`);
  const nightFactor = nightScore !== null ? flagFactor(night, nightScore, `${NS}.positive.nightControlled`, `${NS}.negative.nightHigh`) : {};

  // The same generic suggestion applies regardless of which discretionary
  // category triggered it — added at most once even when several flags
  // (eating out, coffee, weekend, night) are all high, not once per flag.
  let hasDiscretionaryNegative = false;
  for (const factor of [eatingOutFactor, coffeeFactor, weekendFactor, nightFactor]) {
    if (factor.positive) positiveFactors.push(factor.positive);
    if (factor.negative) {
      negativeFactors.push(factor.negative);
      hasDiscretionaryNegative = true;
    }
  }
  if (hasDiscretionaryNegative) {
    improvementSuggestions.push({ key: `${NS}.suggestion.reduceDiscretionarySpending`, params: {} });
  }

  if (impulseTotal > 0 && impulseScore < 50) {
    negativeFactors.push({ key: `${NS}.negative.impulsePurchases`, params: { amount: Math.round(impulseTotal), count: impulsePurchases.length } });
  }

  if (subscriptions.length > 0) {
    if (subscriptionScore >= 80) {
      positiveFactors.push({ key: `${NS}.positive.subscriptionsControlled`, params: { count: subscriptions.length } });
    } else if (subscriptionScore < 50) {
      negativeFactors.push({ key: `${NS}.negative.subscriptionsHigh`, params: { count: subscriptions.length, amount: Math.round(subscriptionTotal) } });
      improvementSuggestions.push({ key: `${NS}.suggestion.reviewSubscriptions`, params: {} });
    }
  }

  return {
    category: "behavior",
    score,
    weight,
    explanation: { reason: { key: `${NS}.reason.hasData`, params: {} }, positiveFactors, negativeFactors, improvementSuggestions },
  };
}
