import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { withEstimatedImpact } from "@/features/finance/aiAnalytics/engine/rules/shared";
import type { Recommendation, RecommendationPriority } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

import reduceOverBudgetCategoryRule from "@/features/finance/aiAnalytics/engine/rules/budget/reduceOverBudgetCategory.rule";
import reduceBehaviorSpendingRule from "@/features/finance/aiAnalytics/engine/rules/behavior/reduceBehaviorSpending.rule";
import reduceCategoryOverspendRule from "@/features/finance/aiAnalytics/engine/rules/expense/reduceCategoryOverspend.rule";
import increaseSavingRateRule from "@/features/finance/aiAnalytics/engine/rules/savings/increaseSavingRate.rule";
import reduceRestaurantVisitsRule from "@/features/finance/aiAnalytics/engine/rules/food/reduceRestaurantVisits.rule";
import reduceCoffeeVisitsRule from "@/features/finance/aiAnalytics/engine/rules/food/reduceCoffeeVisits.rule";
import savingRateCriticalRule from "@/features/finance/aiAnalytics/engine/rules/financialHealth/savingRateCritical.rule";
import expenseRatioHighRule from "@/features/finance/aiAnalytics/engine/rules/financialHealth/expenseRatioHigh.rule";
import incomeGrowthNegativeRule from "@/features/finance/aiAnalytics/engine/rules/financialHealth/incomeGrowthNegative.rule";
import budgetNear90Rule from "@/features/finance/aiAnalytics/engine/rules/budget/budgetNear90.rule";
import repeatedBudgetOverflowRule from "@/features/finance/aiAnalytics/engine/rules/budget/repeatedBudgetOverflow.rule";
import underutilizedBudgetRule from "@/features/finance/aiAnalytics/engine/rules/budget/underutilizedBudget.rule";
import goalBehindScheduleRule from "@/features/finance/aiAnalytics/engine/rules/goal/goalBehindSchedule.rule";
import goalCompletedRule from "@/features/finance/aiAnalytics/engine/rules/goal/goalCompleted.rule";
import goalNearlyCompleteRule from "@/features/finance/aiAnalytics/engine/rules/goal/goalNearlyComplete.rule";
import goalAccelerationRule from "@/features/finance/aiAnalytics/engine/rules/goal/goalAcceleration.rule";
import foodShareCriticalRule from "@/features/finance/aiAnalytics/engine/rules/food/foodShareCritical.rule";
import foodIncreasingTrendRule from "@/features/finance/aiAnalytics/engine/rules/food/foodIncreasingTrend.rule";
import restaurantVisitsCriticalRule from "@/features/finance/aiAnalytics/engine/rules/restaurant/restaurantVisitsCritical.rule";
import averageMealCostIncreasingRule from "@/features/finance/aiAnalytics/engine/rules/restaurant/averageMealCostIncreasing.rule";
import coffeeAboveMonthlyAverageRule from "@/features/finance/aiAnalytics/engine/rules/food/coffeeAboveMonthlyAverage.rule";
import shoppingGrowthHighRule from "@/features/finance/aiAnalytics/engine/rules/shopping/shoppingGrowthHigh.rule";
import impulsePurchasesRule from "@/features/finance/aiAnalytics/engine/rules/shopping/impulsePurchases.rule";
import weekendShoppingRule from "@/features/finance/aiAnalytics/engine/rules/shopping/weekendShopping.rule";
import merchantDependencyRule from "@/features/finance/aiAnalytics/engine/rules/merchant/merchantDependency.rule";
import fastestGrowingMerchantRule from "@/features/finance/aiAnalytics/engine/rules/merchant/fastestGrowingMerchant.rule";
import manySubscriptionsRule from "@/features/finance/aiAnalytics/engine/rules/subscription/manySubscriptions.rule";
import subscriptionPriceIncreaseRule from "@/features/finance/aiAnalytics/engine/rules/subscription/subscriptionPriceIncrease.rule";
import transportAboveAverageRule from "@/features/finance/aiAnalytics/engine/rules/transport/transportAboveAverage.rule";
import rideHailingDependencyRule from "@/features/finance/aiAnalytics/engine/rules/transport/rideHailingDependency.rule";
import negativeCashFlowRule from "@/features/finance/aiAnalytics/engine/rules/cashFlow/negativeCashFlow.rule";
import repeatedNegativeCashFlowRule from "@/features/finance/aiAnalytics/engine/rules/cashFlow/repeatedNegativeCashFlow.rule";
import expenseSpikeRule from "@/features/finance/aiAnalytics/engine/rules/cashFlow/expenseSpike.rule";
import lateNightSpendingRule from "@/features/finance/aiAnalytics/engine/rules/behavior/lateNightSpending.rule";
import weekendOverspendingRule from "@/features/finance/aiAnalytics/engine/rules/behavior/weekendOverspending.rule";
import largeSpendingAfterSalaryRule from "@/features/finance/aiAnalytics/engine/rules/behavior/largeSpendingAfterSalary.rule";
import noSpendingStreakRule from "@/features/finance/aiAnalytics/engine/rules/behavior/noSpendingStreak.rule";
import forecastBudgetOverflowRule from "@/features/finance/aiAnalytics/engine/rules/forecast/forecastBudgetOverflow.rule";
import forecastNegativeCashFlowRule from "@/features/finance/aiAnalytics/engine/rules/forecast/forecastNegativeCashFlow.rule";
import forecastSavingsDeclineRule from "@/features/finance/aiAnalytics/engine/rules/forecast/forecastSavingsDecline.rule";
import savingRateImprovingRule from "@/features/finance/aiAnalytics/engine/rules/positive/savingRateImproving.rule";
import budgetRespectedRule from "@/features/finance/aiAnalytics/engine/rules/positive/budgetRespected.rule";
import expensesDecreasingRule from "@/features/finance/aiAnalytics/engine/rules/positive/expensesDecreasing.rule";
import incomeIncreasingRule from "@/features/finance/aiAnalytics/engine/rules/positive/incomeIncreasing.rule";
import consistentSavingRule from "@/features/finance/aiAnalytics/engine/rules/positive/consistentSaving.rule";
import excellentBudgetDisciplineRule from "@/features/finance/aiAnalytics/engine/rules/positive/excellentBudgetDiscipline.rule";

const PRIORITY_ORDER: Record<RecommendationPriority, number> = { critical: 0, high: 1, medium: 2, low: 3, information: 4 };

// Central manifest — every rule is imported above and listed here exactly
// once. Adding a rule = write its own file, then add one import line and
// one array entry here. No existing rule file, and nothing else in this
// registry, ever needs to change.
const rules: FinancialRule[] = [
  reduceOverBudgetCategoryRule,
  reduceBehaviorSpendingRule,
  reduceCategoryOverspendRule,
  increaseSavingRateRule,
  reduceRestaurantVisitsRule,
  reduceCoffeeVisitsRule,
  savingRateCriticalRule,
  expenseRatioHighRule,
  incomeGrowthNegativeRule,
  budgetNear90Rule,
  repeatedBudgetOverflowRule,
  underutilizedBudgetRule,
  goalBehindScheduleRule,
  goalCompletedRule,
  goalNearlyCompleteRule,
  goalAccelerationRule,
  foodShareCriticalRule,
  foodIncreasingTrendRule,
  restaurantVisitsCriticalRule,
  averageMealCostIncreasingRule,
  coffeeAboveMonthlyAverageRule,
  shoppingGrowthHighRule,
  impulsePurchasesRule,
  weekendShoppingRule,
  merchantDependencyRule,
  fastestGrowingMerchantRule,
  manySubscriptionsRule,
  subscriptionPriceIncreaseRule,
  transportAboveAverageRule,
  rideHailingDependencyRule,
  negativeCashFlowRule,
  repeatedNegativeCashFlowRule,
  expenseSpikeRule,
  lateNightSpendingRule,
  weekendOverspendingRule,
  largeSpendingAfterSalaryRule,
  noSpendingStreakRule,
  forecastBudgetOverflowRule,
  forecastNegativeCashFlowRule,
  forecastSavingsDeclineRule,
  savingRateImprovingRule,
  budgetRespectedRule,
  expensesDecreasingRule,
  incomeIncreasingRule,
  consistentSavingRule,
  excellentBudgetDisciplineRule,
];

export function runRules(context: RuleContext): Recommendation[] {
  const drafts = rules.filter((r) => r.enabled).flatMap((r) => r.evaluate(context));
  const recommendations = withEstimatedImpact(drafts, context.cashFlowAnalysis.expense);
  return recommendations.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.estimatedMonthlySavings - a.estimatedMonthlySavings);
}
