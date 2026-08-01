// 5 guarded selections — each entry is included only when its source
// genuinely supports it; never a fabricated/misleading default.

import type { FinancialSnapshot } from "@/features/finance/aiAnalytics/models/financial-snapshot.model";
import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { CategoryComparisonEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { DetectedHabit } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { FinancialHighlights, HighlightEntry } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

const NS = "aiAnalytics.executiveSummaryReport.highlights";

function highestSpendingCategoryEntry(financialSnapshot: FinancialSnapshot): HighlightEntry | null {
  const top = financialSnapshot.categoryTotals[0];
  if (!top) return null;

  return {
    type: "highestSpendingCategory",
    message: { key: `${NS}.highestSpendingCategory`, params: { category: top.category, amount: Math.round(top.amount) } },
    supportingMetrics: { amount: top.amount, percentOfTotal: top.percentOfTotal },
  };
}

// Reuses the habit's own already-computed message verbatim — a real
// finding, not a new synthesized sentence.
function bestPerformingHabitEntry(positiveHabits: DetectedHabit[]): HighlightEntry | null {
  if (positiveHabits.length === 0) return null;
  const best = positiveHabits.reduce((top, h) => (h.confidence > top.confidence ? h : top));

  return { type: "bestPerformingHabit", message: best.message, supportingMetrics: { ...best.supportingMetrics, confidence: best.confidence } };
}

// Guarded to changePercent < 0 first — without this, an all-categories-
// increased month would mislabel the smallest increase as an
// "improvement," misrepresenting the data.
function largestImprovementEntry(categoryComparison: CategoryComparisonEntry[]): HighlightEntry | null {
  const decreased = categoryComparison.filter((c) => c.changePercent !== null && c.changePercent < 0);
  if (decreased.length === 0) return null;

  const best = decreased.reduce((top, c) => (c.changePercent! < top.changePercent! ? c : top));
  return {
    type: "largestImprovement",
    message: { key: `${NS}.largestImprovement`, params: { category: best.category, changePercent: Math.round(Math.abs(best.changePercent!)) } },
    supportingMetrics: { current: best.current, previous: best.previous, changePercent: best.changePercent! },
  };
}

function savingAchievementEntry(financialSnapshot: FinancialSnapshot): HighlightEntry | null {
  const { savingRatePercent, savings } = financialSnapshot;
  if (savingRatePercent === null || savingRatePercent <= 0) return null;

  return {
    type: "savingAchievement",
    message: { key: `${NS}.savingAchievement`, params: { savingRatePercent: Math.round(savingRatePercent), savings: Math.round(savings) } },
    supportingMetrics: { savingRatePercent, savings },
  };
}

function budgetAchievementEntry(budgetAnalysis: BudgetAnalysisResult): HighlightEntry | null {
  const totalCount = budgetAnalysis.entries.length;
  if (totalCount === 0) return null;

  return {
    type: "budgetAchievement",
    message: { key: `${NS}.budgetAchievement`, params: { okCount: budgetAnalysis.okCount, totalCount } },
    supportingMetrics: { okCount: budgetAnalysis.okCount, totalCount },
  };
}

export function buildFinancialHighlights(
  financialSnapshot: FinancialSnapshot,
  positiveHabits: DetectedHabit[],
  categoryComparison: CategoryComparisonEntry[],
  budgetAnalysis: BudgetAnalysisResult
): FinancialHighlights {
  const entries = [
    highestSpendingCategoryEntry(financialSnapshot),
    bestPerformingHabitEntry(positiveHabits),
    largestImprovementEntry(categoryComparison),
    savingAchievementEntry(financialSnapshot),
    budgetAchievementEntry(budgetAnalysis),
  ].filter((e): e is HighlightEntry => e !== null);

  return { entries };
}
