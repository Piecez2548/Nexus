import type { ForecastAlertSeverity } from "@/features/finance/aiAnalytics/engine/forecast/types";

// Mirrors RecommendationsSection.tsx's PRIORITY_BADGE_CLASS Tailwind-opacity
// convention — a new map rather than reuse, since ForecastAlertSeverity's
// 3 tiers don't line up 1:1 with RecommendationPriority's 5. Kept in its
// own file (not inline in ForecastAlertsList.tsx) since ForecastSection.tsx
// also needs it for the topAlert header banner.
export const SEVERITY_BADGE_CLASS: Record<ForecastAlertSeverity, string> = {
  critical: "bg-red-600/20 text-red-600 dark:text-red-400",
  warning: "bg-amber-500/15 text-amber-500",
  info: "bg-blue-500/15 text-blue-500",
};
