import { buildDomainSpendingResponse } from "@/features/finance/aiAnalytics/engine/coach/responders/domainSpendingResponder";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

export function respondRestaurantAnalysis(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  return buildDomainSpendingResponse({
    domain: data.behaviorProfile.profile.foodAnalysis,
    answerKeyPrefix: "aiAnalytics.aiCoach.answers.restaurantAnalysis",
    relatedCategories: ["restaurant", "food"],
    actionableRecommendations: data.actionableRecommendations,
  });
}
