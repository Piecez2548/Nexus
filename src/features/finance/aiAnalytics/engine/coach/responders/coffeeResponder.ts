import { buildDomainSpendingResponse } from "@/features/finance/aiAnalytics/engine/coach/responders/domainSpendingResponder";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

export function respondCoffeeAnalysis(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  return buildDomainSpendingResponse({
    domain: data.behaviorProfile.profile.coffeeAnalysis,
    answerKeyPrefix: "aiAnalytics.aiCoach.answers.coffeeAnalysis",
    relatedCategories: ["coffee"],
    actionableRecommendations: data.actionableRecommendations,
  });
}
