// Central manifest — mirrors engine/rules/registry.ts's own role (one
// import + one entry per unit) as a Record rather than an array, since
// CoachIntent is already a closed set of 16 unique keys, unlike rule ids.

import { respondFinancialOverview } from "@/features/finance/aiAnalytics/engine/coach/responders/financialOverviewResponder";
import { respondExpenseAnalysis } from "@/features/finance/aiAnalytics/engine/coach/responders/expenseAnalysisResponder";
import { respondIncomeAnalysis } from "@/features/finance/aiAnalytics/engine/coach/responders/incomeAnalysisResponder";
import { respondBudgetStatus } from "@/features/finance/aiAnalytics/engine/coach/responders/budgetStatusResponder";
import { respondSavingsProgress } from "@/features/finance/aiAnalytics/engine/coach/responders/savingsProgressResponder";
import { respondCashFlow } from "@/features/finance/aiAnalytics/engine/coach/responders/cashFlowResponder";
import { respondFinancialHealthScore } from "@/features/finance/aiAnalytics/engine/coach/responders/financialHealthScoreResponder";
import { respondCategorySpending } from "@/features/finance/aiAnalytics/engine/coach/responders/categorySpendingResponder";
import { respondMerchantSpending } from "@/features/finance/aiAnalytics/engine/coach/responders/merchantSpendingResponder";
import { respondRestaurantAnalysis } from "@/features/finance/aiAnalytics/engine/coach/responders/restaurantResponder";
import { respondCoffeeAnalysis } from "@/features/finance/aiAnalytics/engine/coach/responders/coffeeResponder";
import { respondShoppingAnalysis } from "@/features/finance/aiAnalytics/engine/coach/responders/shoppingResponder";
import { respondForecast } from "@/features/finance/aiAnalytics/engine/coach/responders/forecastResponder";
import { respondGoalProgress } from "@/features/finance/aiAnalytics/engine/coach/responders/goalProgressResponder";
import { respondRecommendations } from "@/features/finance/aiAnalytics/engine/coach/responders/recommendationsResponder";
import { respondBehaviorAnalysis } from "@/features/finance/aiAnalytics/engine/coach/responders/behaviorAnalysisResponder";
import type { CoachIntent, CoachResponder } from "@/features/finance/aiAnalytics/engine/coach/types";

export const RESPONDER_REGISTRY: Record<CoachIntent, CoachResponder> = {
  financialOverview: respondFinancialOverview,
  expenseAnalysis: respondExpenseAnalysis,
  incomeAnalysis: respondIncomeAnalysis,
  budgetStatus: respondBudgetStatus,
  savingsProgress: respondSavingsProgress,
  cashFlow: respondCashFlow,
  financialHealthScore: respondFinancialHealthScore,
  categorySpending: respondCategorySpending,
  merchantSpending: respondMerchantSpending,
  restaurantAnalysis: respondRestaurantAnalysis,
  coffeeAnalysis: respondCoffeeAnalysis,
  shoppingAnalysis: respondShoppingAnalysis,
  forecast: respondForecast,
  goalProgress: respondGoalProgress,
  recommendations: respondRecommendations,
  behaviorAnalysis: respondBehaviorAnalysis,
};
