import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";

const mockChat = vi.fn();

vi.mock("@/ai/services/aiGatewayService", () => ({
  aiGateway: { chat: (...args: unknown[]) => mockChat(...args) },
}));

vi.mock("@/lib/supabaseClient", () => ({ isSyncConfigured: true }));

const { default: AiCoachSection } = await import("./AiCoachSection");
const { useAiCoachSettingsStore } = await import("@/store/aiCoachSettingsStore");
const { useAuthStore } = await import("@/features/sync/store/authStore");
const { ProviderUnavailableError } = await import("@/ai/utils/errors");

// Only the fields the "financialOverview" responder + coach orchestration
// actually touch -- same partial-fixture-cast convention askCoach.test.ts
// already uses, since a full FinancialAnalysisResult has ~18 required
// top-level fields this test has no use for.
const DATA = {
  meta: { generatedAt: "2026-08-21T00:00:00.000Z", transactionCount: 5, monthsOfHistory: 3 },
  financialSnapshot: {
    transactionCount: 5,
    income: 50000,
    expense: 30000,
    savings: 20000,
    currentBalance: 100000,
    netCashFlow: 20000,
    savingRatePercent: 40,
    categoryTotals: [],
  },
  financialHealthScore: { overallScore: 80, grade: "B", status: "good" },
  budgetAnalysis: { entries: [] },
  behaviorProfile: {
    profile: { spendingStyle: { primaryStyle: null, confidence: 0 } },
    positiveHabits: [],
    negativeHabits: [],
  },
  actionableRecommendations: [],
} as unknown as FinancialAnalysisResult;

const UNKNOWN_ANSWER = "I'm not sure I understood that question. Try asking about your spending, budget, savings, or forecast.";

async function askQuestion(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText("Ask a question about your finances..."), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
}

describe("AiCoachSection", () => {
  beforeEach(() => {
    useAiCoachSettingsStore.setState({ enabled: false });
    useAuthStore.setState({ user: { id: "u1" } as never });
    mockChat.mockReset();
  });

  it("answers a known-intent question synchronously via the rule engine, with no aiGateway call", async () => {
    render(<AiCoachSection data={DATA} />);
    await askQuestion("financial overview");

    // Only the rule-engine path renders a confidence line (AiCoachAnswerCard
    // hides it entirely for LLM-sourced answers) -- its presence proves this
    // went through computeCoachResponse(), not the LLM fallback.
    expect(await screen.findByText(/Confidence:/)).toBeInTheDocument();
    expect(mockChat).not.toHaveBeenCalled();
  });

  it("shows the static fallback for an unknown question when the LLM fallback is off", async () => {
    render(<AiCoachSection data={DATA} />);
    await askQuestion("asdkjaslkdjaslkdj");

    expect(await screen.findByText(UNKNOWN_ANSWER)).toBeInTheDocument();
    expect(mockChat).not.toHaveBeenCalled();
  });

  it("shows the static fallback for an unknown question when signed out, even if opted in", async () => {
    useAiCoachSettingsStore.setState({ enabled: true });
    useAuthStore.setState({ user: null });

    render(<AiCoachSection data={DATA} />);
    await askQuestion("asdkjaslkdjaslkdj");

    expect(await screen.findByText(UNKNOWN_ANSWER)).toBeInTheDocument();
    expect(mockChat).not.toHaveBeenCalled();
  });

  it("routes an unknown question to the real LLM fallback when opted in, signed in, and configured", async () => {
    useAiCoachSettingsStore.setState({ enabled: true });
    mockChat.mockResolvedValue({ content: "You're spending well within your income this month.", confidence: 60, provider: "claude", executionTimeMs: 10 });

    render(<AiCoachSection data={DATA} />);
    await askQuestion("asdkjaslkdjaslkdj");

    expect(await screen.findByText("You're spending well within your income this month.")).toBeInTheDocument();
    expect(screen.getByText("AI-generated answer")).toBeInTheDocument();
    expect(screen.queryByText(/Confidence:/)).not.toBeInTheDocument();
    expect(mockChat).toHaveBeenCalledTimes(1);
  });

  it("falls back to the static response when the LLM call fails with a Gateway error, without crashing", async () => {
    useAiCoachSettingsStore.setState({ enabled: true });
    mockChat.mockRejectedValue(new ProviderUnavailableError("Daily limit reached"));

    render(<AiCoachSection data={DATA} />);
    await askQuestion("asdkjaslkdjaslkdj");

    expect(await screen.findByText(UNKNOWN_ANSWER)).toBeInTheDocument();
  });

  it("disables the input while the LLM call is in flight, and re-enables it after", async () => {
    useAiCoachSettingsStore.setState({ enabled: true });
    let resolveChat: (value: unknown) => void = () => {};
    mockChat.mockReturnValue(
      new Promise((resolve) => {
        resolveChat = resolve;
      })
    );

    render(<AiCoachSection data={DATA} />);
    const input = screen.getByPlaceholderText("Ask a question about your finances...");
    const user = userEvent.setup();
    await user.type(input, "asdkjaslkdjaslkdj");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(input).toBeDisabled();

    resolveChat({ content: "Answer.", confidence: 60, provider: "claude", executionTimeMs: 5 });
    expect(await screen.findByText("Answer.")).toBeInTheDocument();
    expect(input).not.toBeDisabled();
  });
});
