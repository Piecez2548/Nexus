// LocalRuleProvider — the default AIProvider, delegating to the Financial
// Intelligence Engine / Recommendation Engine / Executive Summary
// Generator / AI Coach (Prompts 004/006/009/010). The Rule Engine
// (engine/rules/registry.ts) is already transitively invoked inside
// runAnalysis (via engine/analyzers/recommendations.ts), so analyze()
// alone already covers "delegates to the Rule Engine" — no separate call
// is made here.
//
// generateRecommendations()/summarize() are NOT standalone entry points
// from raw transactions: RecommendationEngineContext/
// ExecutiveSummaryEngineContext both require already-computed sub-results
// (financialHealthScore, behaviorProfile, forecastProfile, etc.) — exactly
// like calling the real engines directly would require today. A caller
// must already have called analyze() and feed its sub-fields in.
//
// `content` is always a plain, non-translated structural descriptor, never
// resolved prose: every one of this app's engines returns i18n {key,
// params} message objects (recommendation titles, coach answers,
// executive-summary headlines), resolved to display text only via the
// React useTranslation() hook — and this whole src/ai/ subsystem must stay
// independent from React. The full, still-i18n-keyed structured result
// always lives in AIResponse.metadata.result for whatever future UI
// consumes it directly. A future ClaudeProvider would have real prose in
// `content` and simply wouldn't need metadata.result at all.
//
// This is the only file under src/ai/ allowed to import from
// @/features/finance/aiAnalytics/** — every other file in this subsystem
// stays domain-agnostic (Dependency Inversion: the abstraction doesn't
// depend on this concretion; only this concretion depends on it).

import { localStatisticalEngine } from "@/features/finance/aiAnalytics/engine/localStatisticalEngine";
import { localRecommendationEngine } from "@/features/finance/aiAnalytics/engine/recommendation/services/localRecommendationEngine";
import { localExecutiveSummaryEngine } from "@/features/finance/aiAnalytics/engine/executiveSummary/services/localExecutiveSummaryEngine";
import { localCoachEngine } from "@/features/finance/aiAnalytics/engine/coach/services/localCoachEngine";
import { ConfigurationError } from "@/ai/utils/errors";
import type { AIProvider } from "@/ai/interfaces/AIProvider";
import type { AIRequest } from "@/ai/models/AIRequest";
import type { AIResponse } from "@/ai/models/AIResponse";
import type { ProviderConfiguration } from "@/ai/models/ProviderConfiguration";
import type { FinancialAnalysisInput, FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { RecommendationEngineContext } from "@/features/finance/aiAnalytics/engine/recommendation/types";
import type { ExecutiveSummaryEngineContext } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

function contextData(request: AIRequest): Record<string, unknown> {
  const data = request.context?.data;
  if (!data || typeof data !== "object") {
    throw new ConfigurationError("LocalRuleProvider requires request.context.data to be populated.");
  }
  return data;
}

function asFinancialAnalysisInput(data: Record<string, unknown>): FinancialAnalysisInput {
  if (!Array.isArray(data.transactions) || !Array.isArray(data.budgets) || !(data.now instanceof Date)) {
    throw new ConfigurationError("analyze() requires context.data to look like a FinancialAnalysisInput (transactions[], budgets[], now: Date).");
  }
  return data as unknown as FinancialAnalysisInput;
}

function asRecommendationEngineContext(data: Record<string, unknown>): RecommendationEngineContext {
  if (!Array.isArray(data.recommendations) || typeof data.monthsOfHistory !== "number") {
    throw new ConfigurationError("generateRecommendations() requires context.data to look like a RecommendationEngineContext (recommendations[], monthsOfHistory: number).");
  }
  return data as unknown as RecommendationEngineContext;
}

function asExecutiveSummaryEngineContext(data: Record<string, unknown>): ExecutiveSummaryEngineContext {
  if (typeof data.financialSnapshot !== "object" || data.financialSnapshot === null || typeof data.behaviorProfile !== "object" || data.behaviorProfile === null) {
    throw new ConfigurationError("summarize() requires context.data to look like an ExecutiveSummaryEngineContext (financialSnapshot, behaviorProfile).");
  }
  return data as unknown as ExecutiveSummaryEngineContext;
}

function asFinancialAnalysisResult(data: Record<string, unknown>): FinancialAnalysisResult {
  if (!Array.isArray(data.recommendations)) {
    throw new ConfigurationError("chat() requires context.data to look like a FinancialAnalysisResult (recommendations[]).");
  }
  return data as unknown as FinancialAnalysisResult;
}

export class LocalRuleProvider implements AIProvider {
  readonly name = "local-rule";

  // Needs no API key/endpoint/model — accepts the config only to satisfy
  // AIProvider's signature (a future remote provider genuinely needs it).
  initialize(_config: ProviderConfiguration): Promise<void> {
    return Promise.resolve();
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(true);
  }

  async analyze(request: AIRequest): Promise<AIResponse> {
    const startedAt = performance.now();
    const input = asFinancialAnalysisInput(contextData(request));
    const result = await localStatisticalEngine.analyze(input);
    return {
      content: `Financial analysis complete: ${result.insights.length} insight(s), ${result.actionableRecommendations.length} recommendation(s).`,
      confidence: result.executiveSummaryReport.confidence,
      provider: this.name,
      executionTimeMs: performance.now() - startedAt,
      metadata: { result },
    };
  }

  async summarize(request: AIRequest): Promise<AIResponse> {
    const startedAt = performance.now();
    const context = asExecutiveSummaryEngineContext(contextData(request));
    const result = await localExecutiveSummaryEngine.generate(context);
    return {
      content: `Executive summary generated (confidence: ${result.confidence}%).`,
      confidence: result.confidence,
      provider: this.name,
      executionTimeMs: performance.now() - startedAt,
      metadata: { result },
    };
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const startedAt = performance.now();
    const data = asFinancialAnalysisResult(contextData(request));
    if (typeof request.prompt !== "string") {
      throw new ConfigurationError("chat() requires request.prompt to be a string question.");
    }
    const response = await localCoachEngine.ask({ data, questionText: request.prompt });
    return {
      content: `Answered question (intent: ${response.intent}, confidence: ${response.confidence}%).`,
      confidence: response.confidence,
      provider: this.name,
      executionTimeMs: performance.now() - startedAt,
      metadata: { result: response },
    };
  }

  async generateRecommendations(request: AIRequest): Promise<AIResponse> {
    const startedAt = performance.now();
    const context = asRecommendationEngineContext(contextData(request));
    const results = await localRecommendationEngine.generate(context);
    return {
      content: `Generated ${results.length} actionable recommendation(s).`,
      confidence: results[0]?.confidence ?? 50,
      provider: this.name,
      executionTimeMs: performance.now() - startedAt,
      metadata: { result: results },
    };
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
