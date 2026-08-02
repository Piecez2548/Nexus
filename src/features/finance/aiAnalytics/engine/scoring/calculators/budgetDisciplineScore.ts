// Budget Discipline calculator — Budget Compliance (ok/near mix), Budget
// Overruns (average overage severity among "over" budgets), Repeated
// Overspending (a category over budget for `repeatedOverspendMonths`+
// consecutive months, via the shared multiMonthTrends helpers built in
// Prompt 003) — averaged into one 0-100 score. "Consistency" from the spec
// is Repeated Overspending's inverse (a category over budget every month is
// the least consistent outcome this data can express) rather than a 4th
// independent sub-metric.

import { monthlyValuesFor, trailingConsecutiveCount } from "@/features/finance/aiAnalytics/engine/analyzers/multiMonthTrends";
import { clamp } from "@/features/finance/aiAnalytics/engine/shared/mathUtils";
import type { CategoryScoreResult, ScoreContext, ScoreMessage } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { ScoreThresholds } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { BudgetAnalysisEntry } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";

const NS = "aiAnalytics.financialHealthScore.budgetDiscipline";
const REPEATED_OVERSPEND_WINDOW_MONTHS = 6;

function averageOveragePercent(overEntries: BudgetAnalysisEntry[]): number {
  const percentages = overEntries.map((e) => (e.budget.amount > 0 ? (e.spent / e.budget.amount - 1) * 100 : 0));
  return percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
}

export function calculateBudgetDisciplineScore(context: ScoreContext, weight: number, thresholds: ScoreThresholds["budgetDiscipline"]): CategoryScoreResult {
  const { entries } = context.budgetAnalysis;

  if (entries.length === 0) {
    return {
      category: "budgetDiscipline",
      score: null,
      weight,
      explanation: { reason: { key: `${NS}.reason.noBudgets`, params: {} }, positiveFactors: [], negativeFactors: [], improvementSuggestions: [] },
    };
  }

  const okCount = entries.filter((e) => e.status === "ok").length;
  const nearCount = entries.filter((e) => e.status === "near").length;
  const overEntries = entries.filter((e) => e.status === "over");
  const complianceScore = ((okCount + thresholds.nearWeight * nearCount) / entries.length) * 100;

  const overageSeverityScore = overEntries.length === 0 ? 100 : clamp(100 - (averageOveragePercent(overEntries) / thresholds.overageSeverityDivisor) * 100, 0, 100);

  const repeatedCategories = overEntries
    .filter((entry) => {
      const monthlySpend = monthlyValuesFor(context.transactions, entry.budget.category, "expense", REPEATED_OVERSPEND_WINDOW_MONTHS, context.now);
      return trailingConsecutiveCount(monthlySpend, (v) => v > entry.budget.amount) >= thresholds.repeatedOverspendMonths;
    })
    .map((entry) => entry.budget.category);
  const repeatedPenaltyScore = clamp(100 - repeatedCategories.length * 25, 0, 100);

  const score = (complianceScore + overageSeverityScore + repeatedPenaltyScore) / 3;

  const positiveFactors: ScoreMessage[] = [];
  const negativeFactors: ScoreMessage[] = [];
  const improvementSuggestions: ScoreMessage[] = [];

  if (overEntries.length === 0) {
    positiveFactors.push({ key: `${NS}.positive.fullCompliance`, params: {} });
  } else {
    negativeFactors.push({ key: `${NS}.negative.overBudget`, params: { count: overEntries.length } });
    improvementSuggestions.push({ key: `${NS}.suggestion.reviewOverBudget`, params: { count: overEntries.length } });
  }

  if (repeatedCategories.length > 0) {
    negativeFactors.push({ key: `${NS}.negative.repeatedOverspend`, params: { categories: repeatedCategories.join(", "), months: thresholds.repeatedOverspendMonths } });
  }

  return {
    category: "budgetDiscipline",
    score,
    weight,
    explanation: {
      reason: { key: `${NS}.reason.hasData`, params: { okCount, nearCount, overCount: overEntries.length } },
      positiveFactors,
      negativeFactors,
      improvementSuggestions,
    },
  };
}
