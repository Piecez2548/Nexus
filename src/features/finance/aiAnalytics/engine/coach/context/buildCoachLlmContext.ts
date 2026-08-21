// Builds the ONLY shape of financial data that is ever allowed to leave the
// device for the Claude LLM fallback (see AiCoachSection.tsx's "unknown"
// intent path and supabase/functions/ai-coach). Deliberately a strict
// allow-list, not a redaction pass over FinancialAnalysisResult -- round
// numbers, category- and behavior-style-level aggregates only. Never
// includes:
//  - financialSnapshot.largestExpense / merchantTotals (a specific
//    transaction's title/amount/date, and named merchant aliases + their
//    own largest purchase)
//  - data.merchantAnalysis[] (merchant aliases, each one's largest single
//    purchase, monthly growth)
//  - any individual transaction's title, date, or recipient
// A future field belongs here only if it stays at this same aggregate
// level -- never by spreading a whole engine result in wholesale.

import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";

export interface CoachLlmBudgetEntry {
  category: string;
  status: "ok" | "near" | "over";
  percentage: number;
}

export interface CoachLlmTopCategory {
  category: string;
  amount: number;
  percentOfTotal: number;
}

export interface CoachLlmContext {
  monthsOfHistory: number;
  transactionCount: number;
  income: number;
  expense: number;
  savings: number;
  netCashFlow: number;
  savingRatePercent: number | null;
  healthScore: {
    overallScore: number | null;
    grade: string | null;
    status: string | null;
  };
  topCategories: CoachLlmTopCategory[];
  budgets: CoachLlmBudgetEntry[];
  behaviorStyle: {
    primaryStyle: string | null;
    confidence: number;
  };
  // Habit *ids* only (e.g. "restaurant") -- short, generic, machine-readable
  // flags, never the resolved i18n prose (which would require a React/i18n
  // dependency this engine layer deliberately doesn't have) and never
  // anything merchant- or transaction-specific.
  positiveHabitFlags: string[];
  negativeHabitFlags: string[];
}

const MAX_TOP_CATEGORIES = 5;

function round(value: number): number {
  return Math.round(value);
}

export function buildCoachLlmContext(data: FinancialAnalysisResult): CoachLlmContext {
  return {
    monthsOfHistory: data.meta.monthsOfHistory,
    transactionCount: data.meta.transactionCount,
    income: round(data.financialSnapshot.income),
    expense: round(data.financialSnapshot.expense),
    savings: round(data.financialSnapshot.savings),
    netCashFlow: round(data.financialSnapshot.netCashFlow),
    savingRatePercent: data.financialSnapshot.savingRatePercent === null ? null : round(data.financialSnapshot.savingRatePercent),
    healthScore: {
      overallScore: data.financialHealthScore.overallScore === null ? null : round(data.financialHealthScore.overallScore),
      grade: data.financialHealthScore.grade,
      status: data.financialHealthScore.status,
    },
    topCategories: data.financialSnapshot.categoryTotals.slice(0, MAX_TOP_CATEGORIES).map((c) => ({
      category: c.category,
      amount: round(c.amount),
      percentOfTotal: round(c.percentOfTotal),
    })),
    budgets: data.budgetAnalysis.entries.map((e) => ({
      category: e.budget.category,
      status: e.status,
      percentage: round(e.percentage),
    })),
    behaviorStyle: {
      primaryStyle: data.behaviorProfile.profile.spendingStyle.primaryStyle,
      confidence: round(data.behaviorProfile.profile.spendingStyle.confidence),
    },
    positiveHabitFlags: data.behaviorProfile.positiveHabits.map((h) => h.id),
    negativeHabitFlags: data.behaviorProfile.negativeHabits.map((h) => h.id),
  };
}
