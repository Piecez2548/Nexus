// Barrel for the analytics domain model (Prompt 004) — the single import
// path a future API layer or AI provider integration (Claude/OpenAI/
// Gemini/Ollama) consumes this engine's types through, e.g.:
//
//   import type { FinancialSnapshot, Recommendation, Summary } from "@/features/finance/aiAnalytics/models";
//
// Every file re-exported here is either a documented alias of a type an
// analyzer already owns, or one of the 4 real build*() adapters
// (financial-snapshot, merchant-analysis, statistics, summary) — see each
// file's own header comment for what it owns and why.

export * from "@/features/finance/aiAnalytics/models/enums";
export * from "@/features/finance/aiAnalytics/models/financial-health.model";
export * from "@/features/finance/aiAnalytics/models/financial-snapshot.model";
export * from "@/features/finance/aiAnalytics/models/category-analysis.model";
export * from "@/features/finance/aiAnalytics/models/merchant-analysis.model";
export * from "@/features/finance/aiAnalytics/models/behavior-analysis.model";
export * from "@/features/finance/aiAnalytics/models/budget-analysis.model";
export * from "@/features/finance/aiAnalytics/models/cashflow-analysis.model";
export * from "@/features/finance/aiAnalytics/models/forecast.model";
export * from "@/features/finance/aiAnalytics/models/recommendation.model";
export * from "@/features/finance/aiAnalytics/models/insight.model";
export * from "@/features/finance/aiAnalytics/models/summary.model";
export * from "@/features/finance/aiAnalytics/models/statistics.model";
export * from "@/features/finance/aiAnalytics/models/timeline.model";
