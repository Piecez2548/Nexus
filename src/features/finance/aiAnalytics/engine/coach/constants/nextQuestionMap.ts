// Deterministic "what to ask next" lookup — never fabricated free text.
// Paired with one canned, translated example question per intent
// (resolved via i18n at render time; resubmitting it re-runs the exact
// same classifyIntent -> responder pipeline as any typed question, no
// privileged "jump straight to intent" backdoor).

import type { CoachIntent } from "@/features/finance/aiAnalytics/engine/coach/types";

export const NEXT_QUESTION_BY_INTENT: Record<CoachIntent, CoachIntent> = {
  financialOverview: "cashFlow",
  expenseAnalysis: "categorySpending",
  incomeAnalysis: "cashFlow",
  budgetStatus: "forecast",
  savingsProgress: "goalProgress",
  cashFlow: "forecast",
  financialHealthScore: "recommendations",
  categorySpending: "merchantSpending",
  merchantSpending: "recommendations",
  restaurantAnalysis: "recommendations",
  coffeeAnalysis: "recommendations",
  shoppingAnalysis: "recommendations",
  forecast: "budgetStatus",
  goalProgress: "forecast",
  recommendations: "behaviorAnalysis",
  behaviorAnalysis: "recommendations",
};

// Fully-qualified i18n keys — one canned example question per intent,
// bilingual (en/th), resolved at render/resubmit time.
export const EXAMPLE_QUESTION_KEY_BY_INTENT: Record<CoachIntent, string> = {
  financialOverview: "aiAnalytics.aiCoach.examples.financialOverview",
  expenseAnalysis: "aiAnalytics.aiCoach.examples.expenseAnalysis",
  incomeAnalysis: "aiAnalytics.aiCoach.examples.incomeAnalysis",
  budgetStatus: "aiAnalytics.aiCoach.examples.budgetStatus",
  savingsProgress: "aiAnalytics.aiCoach.examples.savingsProgress",
  cashFlow: "aiAnalytics.aiCoach.examples.cashFlow",
  financialHealthScore: "aiAnalytics.aiCoach.examples.financialHealthScore",
  categorySpending: "aiAnalytics.aiCoach.examples.categorySpending",
  merchantSpending: "aiAnalytics.aiCoach.examples.merchantSpending",
  restaurantAnalysis: "aiAnalytics.aiCoach.examples.restaurantAnalysis",
  coffeeAnalysis: "aiAnalytics.aiCoach.examples.coffeeAnalysis",
  shoppingAnalysis: "aiAnalytics.aiCoach.examples.shoppingAnalysis",
  forecast: "aiAnalytics.aiCoach.examples.forecast",
  goalProgress: "aiAnalytics.aiCoach.examples.goalProgress",
  recommendations: "aiAnalytics.aiCoach.examples.recommendations",
  behaviorAnalysis: "aiAnalytics.aiCoach.examples.behaviorAnalysis",
};
