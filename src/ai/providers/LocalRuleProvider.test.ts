import { describe, expect, it } from "vitest";
import { LocalRuleProvider } from "./LocalRuleProvider";
import { localStatisticalEngine } from "@/features/finance/aiAnalytics/engine/localStatisticalEngine";
import { ConfigurationError } from "@/ai/utils/errors";
import type { AIRequest } from "@/ai/models/AIRequest";
import type { FinancialAnalysisInput } from "@/features/finance/aiAnalytics/types";

const NOW = new Date("2026-08-01T00:00:00.000Z");

const INPUT: FinancialAnalysisInput = {
  transactions: [
    { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-08-01", status: "completed" },
    { title: "Groceries", amount: 2000, type: "expense", category: "Food", account: "Cash", date: "2026-08-02", status: "completed" },
    { title: "Dinner out", amount: 600, type: "expense", category: "Food", account: "Cash", date: "2026-08-03", status: "completed" },
  ],
  budgets: [],
  categories: [],
  goals: [],
  recipientProfiles: [],
  goalMilestoneEvents: [],
  now: NOW,
} as unknown as FinancialAnalysisInput;

function request(data: Record<string, unknown>, prompt = "test"): AIRequest {
  return { prompt, context: { domain: "finance", data } };
}

describe("LocalRuleProvider — lifecycle", () => {
  it("is always available, with a no-op initialize/shutdown", async () => {
    const provider = new LocalRuleProvider();
    await expect(provider.isAvailable()).resolves.toBe(true);
    await expect(provider.initialize({ providerName: "local-rule" })).resolves.toBeUndefined();
    await expect(provider.shutdown()).resolves.toBeUndefined();
  });
});

describe("LocalRuleProvider.analyze", () => {
  it("delegates to the real Financial Intelligence Engine and returns the full result in metadata", async () => {
    const provider = new LocalRuleProvider();
    const expected = await localStatisticalEngine.analyze(INPUT);
    const response = await provider.analyze(request(INPUT as unknown as Record<string, unknown>));

    expect(response.provider).toBe("local-rule");
    expect(response.content).toContain("Financial analysis complete");
    expect(response.confidence).toBe(expected.executiveSummaryReport.confidence);
    expect(response.metadata?.result).toEqual(expected);
  });

  it("throws ConfigurationError when context.data doesn't look like a FinancialAnalysisInput", async () => {
    const provider = new LocalRuleProvider();
    await expect(provider.analyze(request({ notTransactions: true }))).rejects.toBeInstanceOf(ConfigurationError);
  });

  it("throws ConfigurationError when context.data is missing entirely", async () => {
    const provider = new LocalRuleProvider();
    await expect(provider.analyze({ prompt: "test" })).rejects.toBeInstanceOf(ConfigurationError);
  });
});

describe("LocalRuleProvider.generateRecommendations", () => {
  it("delegates to the real Recommendation Engine using analyze()'s own sub-results", async () => {
    const provider = new LocalRuleProvider();
    const analysis = await localStatisticalEngine.analyze(INPUT);
    const context = {
      recommendations: analysis.recommendations,
      financialHealthScore: analysis.financialHealthScore,
      merchantAnalysis: analysis.merchantAnalysis,
      budgetAnalysis: analysis.budgetAnalysis,
      cashFlowAnalysis: analysis.cashFlowAnalysis,
      monthsOfHistory: analysis.meta.monthsOfHistory,
      now: NOW,
    };
    const response = await provider.generateRecommendations(request(context as unknown as Record<string, unknown>));
    expect(response.content).toContain("Generated");
    expect(response.metadata?.result).toEqual(analysis.actionableRecommendations);
  });

  it("throws ConfigurationError for a malformed context", async () => {
    const provider = new LocalRuleProvider();
    await expect(provider.generateRecommendations(request({}))).rejects.toBeInstanceOf(ConfigurationError);
  });
});

describe("LocalRuleProvider.summarize", () => {
  it("delegates to the real Executive Summary Generator using analyze()'s own sub-results", async () => {
    const provider = new LocalRuleProvider();
    const analysis = await localStatisticalEngine.analyze(INPUT);
    const context = {
      financialSnapshot: analysis.financialSnapshot,
      financialHealthScore: analysis.financialHealthScore,
      actionableRecommendations: analysis.actionableRecommendations,
      behaviorProfile: analysis.behaviorProfile,
      forecastProfile: analysis.forecastProfile,
      budgetAnalysis: analysis.budgetAnalysis,
      spendingAnalysis: analysis.spendingAnalysis,
    };
    const response = await provider.summarize(request(context as unknown as Record<string, unknown>));
    expect(response.content).toContain("Executive summary generated");
    expect(response.confidence).toBe(analysis.executiveSummaryReport.confidence);
  });

  it("throws ConfigurationError for a malformed context", async () => {
    const provider = new LocalRuleProvider();
    await expect(provider.summarize(request({}))).rejects.toBeInstanceOf(ConfigurationError);
  });
});

describe("LocalRuleProvider.chat", () => {
  it("delegates to the real AI Coach and returns its full response in metadata", async () => {
    const provider = new LocalRuleProvider();
    const analysis = await localStatisticalEngine.analyze(INPUT);
    const response = await provider.chat(request(analysis as unknown as Record<string, unknown>, "How much did I spend this month?"));
    expect(response.content).toContain("Answered question");
    expect(response.metadata?.result).toBeDefined();
  });

  it("throws ConfigurationError when request.prompt isn't a string", async () => {
    const provider = new LocalRuleProvider();
    const analysis = await localStatisticalEngine.analyze(INPUT);
    const malformed = { context: { data: analysis as unknown as Record<string, unknown> } } as AIRequest;
    await expect(provider.chat(malformed)).rejects.toBeInstanceOf(ConfigurationError);
  });

  it("throws ConfigurationError for a malformed context", async () => {
    const provider = new LocalRuleProvider();
    await expect(provider.chat(request({}))).rejects.toBeInstanceOf(ConfigurationError);
  });
});
