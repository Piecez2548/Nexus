// Top-level entry point: runs every detector/analyzer/calculator in this
// module and synthesizes one BehaviorAnalysisEngineResult. Pure and
// synchronous — see services/localBehaviorEngine.ts for the async
// BehaviorEngine-interface wrapper future AI providers can replace.

import { detectRestaurantHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/restaurantDetector";
import { detectCoffeeHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/coffeeDetector";
import { detectConvenienceStoreHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/convenienceStoreDetector";
import { detectWeekendHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/weekendDetector";
import { detectLateNightHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/lateNightDetector";
import { detectImpulseHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/impulseDetector";
import { detectShoppingHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/shoppingDetector";
import { detectSubscriptionHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/subscriptionDetector";
import { detectSalaryDayHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/salaryDayDetector";
import { detectRecurringExpenseHabits } from "@/features/finance/aiAnalytics/engine/behavior/detectors/recurringExpenseDetector";
import { analyzeFoodSpending } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/foodAnalyzer";
import { analyzeCoffeeSpending } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/coffeeAnalyzer";
import { analyzeShoppingSpending } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/shoppingAnalyzer";
import { analyzeTransportSpending } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/transportAnalyzer";
import { analyzeTimeOfDay } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/timeAnalyzer";
import { analyzeMerchantBehavior } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/merchantBehaviorAnalyzer";
import { analyzeRecurringMerchantPatterns } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/recurringPatternAnalyzer";
import { analyzeSeasonalPattern } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/seasonalPatternAnalyzer";
import { classifySpendingStyle } from "@/features/finance/aiAnalytics/engine/behavior/calculators/spendingStyleClassifier";
import { calculateBehaviorScores } from "@/features/finance/aiAnalytics/engine/behavior/calculators/behaviorScoreCalculator";
import { generateBehaviorInsights } from "@/features/finance/aiAnalytics/engine/behavior/insights/behaviorInsightGenerator";
import { aggregateHabits } from "@/features/finance/aiAnalytics/engine/behavior/insights/aggregateHabits";
import type { BehaviorAnalysisEngineResult, BehaviorEngineContext, DetectedHabit } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { RecommendationCategory } from "@/features/finance/aiAnalytics/engine/recommendation/types";

// The Prompt 006 ActionableRecommendation categories this engine's
// "Recommendations" output filters down to — zero new recommendation
// logic, just a view over what already exists.
const BEHAVIOR_RELEVANT_CATEGORIES: RecommendationCategory[] = ["food", "restaurant", "coffee", "shopping", "transport", "subscriptions"];

function collectDetectedHabits(context: BehaviorEngineContext): DetectedHabit[] {
  const singleHabitDetectors = [
    detectRestaurantHabit,
    detectCoffeeHabit,
    detectConvenienceStoreHabit,
    detectWeekendHabit,
    detectLateNightHabit,
    detectImpulseHabit,
    detectShoppingHabit,
    detectSubscriptionHabit,
    detectSalaryDayHabit,
  ];

  const habits = singleHabitDetectors.map((detect) => detect(context)).filter((h): h is DetectedHabit => h !== null);
  return [...habits, ...detectRecurringExpenseHabits(context)];
}

// Data-quality-driven, same spirit as every other "overall confidence"
// figure in this app (e.g. Prompt 006's recommendation confidence penalty
// for an insufficient-data profile) — not a fabricated constant.
function overallConfidence(detectedHabits: DetectedHabit[], insufficientData: boolean): number {
  if (insufficientData) return 30;
  if (detectedHabits.length === 0) return 60;
  return Math.round(detectedHabits.reduce((sum, h) => sum + h.confidence, 0) / detectedHabits.length);
}

export function analyzeBehaviorProfile(context: BehaviorEngineContext): BehaviorAnalysisEngineResult {
  const detectedHabits = collectDetectedHabits(context);
  const { positiveHabits, negativeHabits, improvementOpportunities } = aggregateHabits(detectedHabits);

  const foodAnalysis = analyzeFoodSpending(context);
  const coffeeAnalysis = analyzeCoffeeSpending(context);
  const shoppingAnalysis = analyzeShoppingSpending(context);
  const transportAnalysis = analyzeTransportSpending(context);
  const timeAnalysis = analyzeTimeOfDay(context);
  const merchantBehavior = analyzeMerchantBehavior(context.merchantAnalysis, context.behaviorAnalysis.topMerchants);
  const recurringPatterns = analyzeRecurringMerchantPatterns(context.behaviorAnalysis.topMerchants, context.recipientProfiles, context.transactions);
  const seasonalPattern = analyzeSeasonalPattern(context.transactions, context.now);
  const spendingStyle = classifySpendingStyle(context);

  const scores = calculateBehaviorScores(context);
  const insights = generateBehaviorInsights(context, foodAnalysis, coffeeAnalysis);
  const recommendations = context.actionableRecommendations.filter((r) => BEHAVIOR_RELEVANT_CATEGORIES.includes(r.category));

  return {
    profile: { spendingStyle, foodAnalysis, coffeeAnalysis, shoppingAnalysis, transportAnalysis, timeAnalysis, merchantBehavior, recurringPatterns, seasonalPattern },
    scores,
    timeline: context.timeline,
    detectedHabits,
    positiveHabits,
    negativeHabits,
    improvementOpportunities,
    insights,
    recommendations,
    confidence: overallConfidence(detectedHabits, context.financialHealthScore.insufficientData),
  };
}
