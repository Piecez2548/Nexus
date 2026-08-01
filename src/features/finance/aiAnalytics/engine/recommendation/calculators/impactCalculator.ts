// ImpactEstimate — Monthly/Annual Savings plus two lightweight, honest
// proxies for "Budget Improvement" and "Financial Health Improvement"
// rather than re-running a full simulation for either.

import { estimateAnnualSavings } from "@/features/finance/aiAnalytics/engine/recommendation/calculators/savingsEstimator";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { ImpactEstimate } from "@/features/finance/aiAnalytics/engine/recommendation/types";

export function calculateImpact(rec: Recommendation, budgetAnalysis: BudgetAnalysisResult, cashFlowAnalysis: CashFlowAnalysisResult): ImpactEstimate {
  const monthlySavings = rec.estimatedMonthlySavings;
  const annualSavings = estimateAnnualSavings(monthlySavings);

  // Budget Improvement: what share of this category's current overage
  // would this recommendation's savings eliminate — only meaningful when
  // the rule names a category (params.category) that's actually over
  // budget right now.
  const categoryParam = typeof rec.params.category === "string" ? rec.params.category : null;
  const overBudgetEntry = categoryParam ? budgetAnalysis.entries.find((e) => e.budget.category === categoryParam && e.status === "over") : undefined;
  const overage = overBudgetEntry ? overBudgetEntry.spent - overBudgetEntry.budget.amount : null;
  const budgetImprovementPercent = overage !== null && overage > 0 ? Math.min(Math.round((monthlySavings / overage) * 100), 100) : null;

  // Financial Health Improvement, as a saving-rate-percentage-points proxy
  // — not a re-run of the Prompt 005 scoring engine against a hypothetical
  // future, which would be a much larger, harder-to-justify simulation.
  const { income } = cashFlowAnalysis;
  const savingRateImprovementPercent = income > 0 ? Math.round((monthlySavings / income) * 1000) / 10 : null;

  return { monthlySavings, annualSavings, budgetImprovementPercent, savingRateImprovementPercent };
}
