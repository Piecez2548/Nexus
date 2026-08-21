import { describe, expect, it, vi, afterAll } from "vitest";
import { localStatisticalEngine } from "@/features/finance/aiAnalytics/engine/localStatisticalEngine";
import type { FinancialAnalysisInput } from "@/features/finance/aiAnalytics/types";

// This suite exercises the REAL composed singleton, no mocks, on the
// explicit assumption "local-rule is the default when unconfigured" --
// stubbed here BEFORE the module is imported (not just relying on ambient
// env), since aiGatewayService.ts builds the singleton once at module load
// from whatever VITE_AI_PROVIDER the running machine happens to have set.
// A developer's own .env.local (e.g. VITE_AI_PROVIDER=claude, set for
// local AI Coach testing) must never change which provider this suite
// exercises, and must especially never cause it to make a real, unmocked
// network call to a live Supabase/Anthropic endpoint during a test run.
vi.stubEnv("VITE_AI_PROVIDER", "");

afterAll(() => {
  vi.unstubAllEnvs();
});

const { aiGateway } = await import("./aiGatewayService");

const NOW = new Date("2026-08-01T00:00:00.000Z");

const INPUT: FinancialAnalysisInput = {
  transactions: [
    { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-08-01", status: "completed" },
    { title: "Groceries", amount: 2000, type: "expense", category: "Food", account: "Cash", date: "2026-08-02", status: "completed" },
  ],
  budgets: [],
  categories: [],
  goals: [],
  recipientProfiles: [],
  goalMilestoneEvents: [],
  now: NOW,
} as unknown as FinancialAnalysisInput;

// Real, end-to-end, no mocks: the exported singleton is exercised exactly
// as a future consumer would use it — through the same
// aiGateway.analyze()/chat() call sites a real feature would call — all
// the way down to the real Financial Intelligence Engine / local AI Coach
// (LocalRuleProvider, guaranteed by the env stub above, not ClaudeProvider).
describe("aiGatewayService — the composed singleton", () => {
  it("comes pre-configured with the local-rule provider active by default", async () => {
    const response = await aiGateway.analyze({ prompt: "analyze", context: { data: INPUT as unknown as Record<string, unknown> } });
    expect(response.provider).toBe("local-rule");
    expect(response.content).toContain("Financial analysis complete");
    expect(response.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("resolves chat() end-to-end through the real local AI Coach", async () => {
    const analysis = await localStatisticalEngine.analyze(INPUT);
    const response = await aiGateway.chat({ prompt: "How much did I spend this month?", context: { data: analysis as unknown as Record<string, unknown> } });
    expect(response.content).toContain("Answered question");
    expect(response.metadata?.result).toBeDefined();
  });
});
