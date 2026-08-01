import { buildDomainSpendingResponse } from "@/features/finance/aiAnalytics/engine/coach/responders/domainSpendingResponder";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

export function respondShoppingAnalysis(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  return buildDomainSpendingResponse({
    domain: data.behaviorProfile.profile.shoppingAnalysis,
    answerKeyPrefix: "aiAnalytics.aiCoach.answers.shoppingAnalysis",
    relatedCategories: ["shopping"],
    actionableRecommendations: data.actionableRecommendations,
  });
}
