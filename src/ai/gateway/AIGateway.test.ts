import { describe, expect, it } from "vitest";
import { AIGateway } from "./AIGateway";
import { ProviderRegistry } from "./ProviderRegistry";
import { InvalidResponseError, NetworkError, ProviderTimeoutError, ProviderUnavailableError } from "@/ai/utils/errors";
import type { AIProvider } from "@/ai/interfaces/AIProvider";
import type { AIRequest } from "@/ai/models/AIRequest";
import type { AIResponse } from "@/ai/models/AIResponse";
import type { ProviderConfiguration } from "@/ai/models/ProviderConfiguration";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface FakeProviderBehavior {
  isAvailable?: boolean;
  delayMs?: number;
  throwOnCall?: Error;
  invalidResponse?: boolean;
  // Throws NetworkError for the first N calls to any business method, then
  // succeeds — used to exercise the retry path deterministically.
  failFirstNCalls?: number;
}

// A real class satisfying the real AIProvider interface (not a vi.fn()
// stub of internals) — the only way to deterministically exercise
// timeout/retry/error-mapping paths that LocalRuleProvider, backed by real
// synchronous engines, can never organically trigger.
class FakeProvider implements AIProvider {
  readonly name = "fake";
  initializeCallCount = 0;
  callCount = 0;
  private behavior: FakeProviderBehavior;

  constructor(behavior: FakeProviderBehavior = {}) {
    this.behavior = behavior;
  }

  initialize(): Promise<void> {
    this.initializeCallCount += 1;
    return Promise.resolve();
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(this.behavior.isAvailable ?? true);
  }

  analyze(request: AIRequest): Promise<AIResponse> {
    return this.respond(request);
  }
  summarize(request: AIRequest): Promise<AIResponse> {
    return this.respond(request);
  }
  chat(request: AIRequest): Promise<AIResponse> {
    return this.respond(request);
  }
  generateRecommendations(request: AIRequest): Promise<AIResponse> {
    return this.respond(request);
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  private async respond(_request: AIRequest): Promise<AIResponse> {
    this.callCount += 1;

    if (this.behavior.failFirstNCalls !== undefined && this.callCount <= this.behavior.failFirstNCalls) {
      throw new NetworkError("simulated network failure");
    }
    if (this.behavior.throwOnCall) throw this.behavior.throwOnCall;
    if (this.behavior.delayMs) await sleep(this.behavior.delayMs);

    if (this.behavior.invalidResponse) {
      return { content: 123 as unknown as string, confidence: 0, provider: this.name, executionTimeMs: 0 };
    }
    return { content: "fake response", confidence: 90, provider: this.name, executionTimeMs: 0 };
  }
}

function makeGateway(provider: FakeProvider, configOverrides: Partial<ProviderConfiguration> = {}): AIGateway {
  const registry = new ProviderRegistry();
  registry.register(provider.name, provider, { providerName: provider.name, ...configOverrides });
  registry.enable(provider.name);
  registry.setActive(provider.name);
  return new AIGateway(registry);
}

const REQUEST: AIRequest = { prompt: "test" };

describe("AIGateway — no active provider", () => {
  it("throws ProviderUnavailableError when nothing is registered", async () => {
    const gateway = new AIGateway(new ProviderRegistry());
    await expect(gateway.analyze(REQUEST)).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it("throws ProviderUnavailableError when the active provider reports itself unavailable", async () => {
    const provider = new FakeProvider({ isAvailable: false });
    const gateway = makeGateway(provider);
    await expect(gateway.chat(REQUEST)).rejects.toBeInstanceOf(ProviderUnavailableError);
  });
});

describe("AIGateway — timeout", () => {
  it("throws ProviderTimeoutError when the provider exceeds the configured timeout", async () => {
    const provider = new FakeProvider({ delayMs: 100 });
    const gateway = makeGateway(provider, { timeoutMs: 10 });
    await expect(gateway.summarize(REQUEST)).rejects.toBeInstanceOf(ProviderTimeoutError);
  });
});

describe("AIGateway — retry", () => {
  it("retries a NetworkError up to maxRetries and succeeds", async () => {
    const provider = new FakeProvider({ failFirstNCalls: 1 });
    const gateway = makeGateway(provider, { retryPolicy: { maxRetries: 1, backoffMs: 0 } });
    const response = await gateway.analyze(REQUEST);
    expect(response.content).toBe("fake response");
    expect(provider.callCount).toBe(2);
  });

  it("gives up once retries are exhausted", async () => {
    const provider = new FakeProvider({ failFirstNCalls: 5 });
    const gateway = makeGateway(provider, { retryPolicy: { maxRetries: 1, backoffMs: 0 } });
    await expect(gateway.analyze(REQUEST)).rejects.toBeInstanceOf(NetworkError);
    expect(provider.callCount).toBe(2); // the original attempt + 1 retry, no more
  });

  it("never retries a non-retryable error even with retries configured", async () => {
    const provider = new FakeProvider({ throwOnCall: new Error("not retryable") });
    const gateway = makeGateway(provider, { retryPolicy: { maxRetries: 3, backoffMs: 0 } });
    await expect(gateway.analyze(REQUEST)).rejects.toBeInstanceOf(InvalidResponseError);
    expect(provider.callCount).toBe(1);
  });
});

describe("AIGateway — response validation and error wrapping", () => {
  it("throws InvalidResponseError when content isn't a string", async () => {
    const provider = new FakeProvider({ invalidResponse: true });
    const gateway = makeGateway(provider);
    await expect(gateway.generateRecommendations(REQUEST)).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("wraps an unexpected thrown error as InvalidResponseError, preserving the cause", async () => {
    const original = new Error("boom");
    const provider = new FakeProvider({ throwOnCall: original });
    const gateway = makeGateway(provider);
    const rejection = gateway.chat(REQUEST);
    await expect(rejection).rejects.toBeInstanceOf(InvalidResponseError);
    await rejection.catch((err: InvalidResponseError) => {
      expect(err.cause).toBe(original);
    });
  });
});

describe("AIGateway — timing and initialization", () => {
  it("returns a non-negative executionTimeMs on success", async () => {
    const provider = new FakeProvider();
    const gateway = makeGateway(provider);
    const response = await gateway.analyze(REQUEST);
    expect(response.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("initializes a provider exactly once across multiple calls", async () => {
    const provider = new FakeProvider();
    const gateway = makeGateway(provider);
    await gateway.analyze(REQUEST);
    await gateway.chat(REQUEST);
    await gateway.summarize(REQUEST);
    expect(provider.initializeCallCount).toBe(1);
  });
});
