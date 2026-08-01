// Public barrel for the AI Coach synthesis layer. The UI imports
// computeCoachResponse directly (synchronous, no loading state needed);
// localCoachEngine exists only as the documented future-AI-provider seam.

export * from "@/features/finance/aiAnalytics/engine/coach/types";
export * from "@/features/finance/aiAnalytics/engine/coach/constants/coachIntentKeywords";
export * from "@/features/finance/aiAnalytics/engine/coach/constants/nextQuestionMap";
export * from "@/features/finance/aiAnalytics/engine/coach/classifier/classifyIntent";
export * from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
export * from "@/features/finance/aiAnalytics/engine/coach/calculators/coachConfidenceCalculator";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/domainSpendingResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/restaurantResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/coffeeResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/shoppingResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/financialOverviewResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/expenseAnalysisResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/incomeAnalysisResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/budgetStatusResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/savingsProgressResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/cashFlowResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/financialHealthScoreResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/categorySpendingResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/merchantSpendingResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/forecastResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/goalProgressResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/recommendationsResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/behaviorAnalysisResponder";
export * from "@/features/finance/aiAnalytics/engine/coach/responders/responderRegistry";
export * from "@/features/finance/aiAnalytics/engine/coach/engine/askCoach";
export * from "@/features/finance/aiAnalytics/engine/coach/services/localCoachEngine";
