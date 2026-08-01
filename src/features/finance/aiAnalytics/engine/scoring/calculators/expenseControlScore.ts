// Expense Control calculator — Expense Ratio (expense/income this month),
// Category Balance (top category's concentration of total expense), Large
// Purchases (largest transaction vs the average, from transactionStatistics),
// Unnecessary Spending (behaviorAnalysis.impulsePurchases as a share of
// expense) — averaged into one 0-100 score.

import type { CategoryScoreResult, ScoreContext, ScoreMessage } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { ScoreThresholds } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";

const NS = "aiAnalytics.financialHealthScore.expenseControl";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateExpenseControlScore(context: ScoreContext, weight: number, thresholds: ScoreThresholds["expenseControl"]): CategoryScoreResult {
  const { income, expense } = context.cashFlowAnalysis;

  if (expense === 0) {
    return {
      category: "expenseControl",
      score: null,
      weight,
      explanation: { reason: { key: `${NS}.reason.noExpense`, params: {} }, positiveFactors: [], negativeFactors: [], improvementSuggestions: [] },
    };
  }

  const ratio = income > 0 ? expense / income : null;
  const expenseRatioScore =
    ratio === null ? 0 : clamp(((thresholds.expenseRatioBadMax - ratio) / (thresholds.expenseRatioBadMax - thresholds.expenseRatioGoodMax)) * 100, 0, 100);

  const [topCategory] = context.spendingAnalysis.topCategories;
  const concentrationExcess = topCategory ? Math.max(0, topCategory.percentOfTotal - thresholds.concentrationWarnPercent) : 0;
  const balanceScore = clamp(100 - concentrationExcess * 2, 0, 100);

  const { largestTransaction, averageTransaction } = context.transactionStatistics;
  const largePurchaseRatio = largestTransaction && averageTransaction > 0 ? largestTransaction.amount / averageTransaction : 0;
  const largePurchaseScore = largePurchaseRatio <= thresholds.largePurchaseMultiplier ? 100 : clamp(100 - (largePurchaseRatio - thresholds.largePurchaseMultiplier) * 10, 0, 100);

  const impulseTotal = context.behaviorAnalysis.impulsePurchases.reduce((sum, p) => sum + p.amount, 0);
  const impulseSharePercent = (impulseTotal / expense) * 100;
  const unnecessaryScore = clamp(100 - impulseSharePercent * 3, 0, 100);

  const score = (expenseRatioScore + balanceScore + largePurchaseScore + unnecessaryScore) / 4;

  const positiveFactors: ScoreMessage[] = [];
  const negativeFactors: ScoreMessage[] = [];
  const improvementSuggestions: ScoreMessage[] = [];

  if (ratio !== null && ratio <= thresholds.expenseRatioGoodMax) {
    positiveFactors.push({ key: `${NS}.positive.lowExpenseRatio`, params: { percent: Math.round(ratio * 100) } });
  } else if (ratio === null || ratio >= thresholds.expenseRatioBadMax) {
    negativeFactors.push({ key: `${NS}.negative.highExpenseRatio`, params: { percent: ratio === null ? 100 : Math.round(ratio * 100) } });
    improvementSuggestions.push({ key: `${NS}.suggestion.lowerExpenseRatio`, params: {} });
  }

  if (concentrationExcess > 0 && topCategory) {
    negativeFactors.push({ key: `${NS}.negative.categoryConcentration`, params: { category: topCategory.category, percent: Math.round(topCategory.percentOfTotal) } });
  }

  if (largePurchaseScore < 70 && largestTransaction) {
    negativeFactors.push({ key: `${NS}.negative.largePurchase`, params: { title: largestTransaction.title, amount: largestTransaction.amount } });
  }

  if (impulseTotal === 0) {
    positiveFactors.push({ key: `${NS}.positive.noImpulsePurchases`, params: {} });
  } else if (impulseSharePercent > 10) {
    negativeFactors.push({ key: `${NS}.negative.unnecessarySpending`, params: { percent: Math.round(impulseSharePercent) } });
    improvementSuggestions.push({ key: `${NS}.suggestion.reduceImpulsePurchases`, params: {} });
  }

  return {
    category: "expenseControl",
    score,
    weight,
    explanation: { reason: { key: `${NS}.reason.hasData`, params: { expense: Math.round(expense) } }, positiveFactors, negativeFactors, improvementSuggestions },
  };
}
