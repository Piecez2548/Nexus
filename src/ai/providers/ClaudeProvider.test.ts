import { describe, expect, it, vi, beforeEach } from "vitest";
import { FunctionsHttpError, FunctionsFetchError, FunctionsRelayError } from "@supabase/supabase-js";
import { ClaudeProvider } from "./ClaudeProvider";
import { AuthenticationError, ConfigurationError, NetworkError, ProviderUnavailableError } from "@/ai/utils/errors";
import type { AIRequest } from "@/ai/models/AIRequest";

const mockInvoke = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

function request(prompt = "How much did I spend on food?"): AIRequest {
  return { prompt, context: { domain: "finance.aiCoach", data: {} }, metadata: { language: "en" } };
}

describe("ClaudeProvider", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("is available and initializes without error when Supabase is configured", async () => {
    const provider = new ClaudeProvider();
    expect(provider.name).toBe("claude");
    await expect(provider.isAvailable()).resolves.toBe(true);
    await expect(provider.initialize({ providerName: "claude" })).resolves.toBeUndefined();
    await expect(provider.shutdown()).resolves.toBeUndefined();
  });

  it("chat() maps a successful invoke() into an AIResponse", async () => {
    mockInvoke.mockResolvedValue({
      data: { text: "You spent 1,200 on food this month.", tokensUsed: { input: 100, output: 40 } },
      error: null,
      response: undefined,
    });

    const provider = new ClaudeProvider();
    const response = await provider.chat(request());

    expect(mockInvoke).toHaveBeenCalledWith("ai-coach", {
      body: { questionText: "How much did I spend on food?", context: {}, language: "en" },
    });
    expect(response.content).toBe("You spent 1,200 on food this month.");
    expect(response.provider).toBe("claude");
    expect(response.tokenUsage).toEqual({ promptTokens: 100, completionTokens: 40, totalTokens: 140 });
  });

  it("chat() maps a 429 FunctionsHttpError into ProviderUnavailableError", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(new Response(null, { status: 429 })),
      response: new Response(null, { status: 429 }),
    });

    const provider = new ClaudeProvider();
    await expect(provider.chat(request())).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it("chat() maps a 401 FunctionsHttpError into AuthenticationError", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(new Response(null, { status: 401 })),
      response: new Response(null, { status: 401 }),
    });

    const provider = new ClaudeProvider();
    await expect(provider.chat(request())).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("chat() maps any other FunctionsHttpError status into NetworkError", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(new Response(null, { status: 500 })),
      response: new Response(null, { status: 500 }),
    });

    const provider = new ClaudeProvider();
    await expect(provider.chat(request())).rejects.toBeInstanceOf(NetworkError);
  });

  it("chat() maps a FunctionsRelayError into NetworkError", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new FunctionsRelayError({ region: "us-east-1" }), response: undefined });

    const provider = new ClaudeProvider();
    await expect(provider.chat(request())).rejects.toBeInstanceOf(NetworkError);
  });

  it("chat() maps a FunctionsFetchError into NetworkError", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new FunctionsFetchError(new TypeError("fetch failed")), response: undefined });

    const provider = new ClaudeProvider();
    await expect(provider.chat(request())).rejects.toBeInstanceOf(NetworkError);
  });

  it("chat() throws NetworkError when the response shape is unexpected", async () => {
    mockInvoke.mockResolvedValue({ data: { unexpected: true }, error: null, response: undefined });

    const provider = new ClaudeProvider();
    await expect(provider.chat(request())).rejects.toBeInstanceOf(NetworkError);
  });

  it("analyze()/summarize()/generateRecommendations() throw ConfigurationError", async () => {
    const provider = new ClaudeProvider();
    await expect(provider.analyze()).rejects.toBeInstanceOf(ConfigurationError);
    await expect(provider.summarize()).rejects.toBeInstanceOf(ConfigurationError);
    await expect(provider.generateRecommendations()).rejects.toBeInstanceOf(ConfigurationError);
  });
});
