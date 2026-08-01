import { ProviderRegistry } from "@/ai/gateway/ProviderRegistry";
import { DEFAULT_RETRY_POLICY, DEFAULT_TIMEOUT_MS } from "@/ai/models/ProviderConfiguration";
import { AIGatewayError, InvalidResponseError, NetworkError, ProviderTimeoutError, ProviderUnavailableError } from "@/ai/utils/errors";
import type { AIProvider } from "@/ai/interfaces/AIProvider";
import type { AIRequest } from "@/ai/models/AIRequest";
import type { AIResponse } from "@/ai/models/AIResponse";

type BusinessMethod = "analyze" | "summarize" | "chat" | "generateRecommendations";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new ProviderTimeoutError(`Provider did not respond within ${timeoutMs}ms.`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function toGatewayError(err: unknown, providerName: string): AIGatewayError {
  if (err instanceof AIGatewayError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new InvalidResponseError(`Provider "${providerName}" threw an unexpected error: ${message}`, { cause: err });
}

// The facade every business module talks to — never a provider directly.
// Delegates to whichever AIProvider the injected ProviderRegistry currently
// has active, applying uniform timeout/retry/error-mapping/timing behavior
// regardless of which provider is behind it.
export class AIGateway {
  // Tracks which provider instances have already been initialize()'d, so a
  // provider is only initialized once even across many calls — a WeakSet
  // rather than a boolean flag on the provider itself, since AIProvider
  // implementations shouldn't need to know about Gateway-level bookkeeping.
  private initialized = new WeakSet<AIProvider>();
  private registry: ProviderRegistry;

  constructor(registry: ProviderRegistry) {
    this.registry = registry;
  }

  analyze(request: AIRequest): Promise<AIResponse> {
    return this.dispatch("analyze", request);
  }

  summarize(request: AIRequest): Promise<AIResponse> {
    return this.dispatch("summarize", request);
  }

  chat(request: AIRequest): Promise<AIResponse> {
    return this.dispatch("chat", request);
  }

  generateRecommendations(request: AIRequest): Promise<AIResponse> {
    return this.dispatch("generateRecommendations", request);
  }

  private async dispatch(method: BusinessMethod, request: AIRequest): Promise<AIResponse> {
    const active = this.registry.getActive();
    if (!active) throw new ProviderUnavailableError("No active AI provider is registered.");

    const { provider, config } = active;

    const isAvailable = await provider.isAvailable();
    if (!isAvailable) throw new ProviderUnavailableError(`Provider "${provider.name}" reports itself unavailable.`);

    if (!this.initialized.has(provider)) {
      await provider.initialize(config);
      this.initialized.add(provider);
    }

    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retryPolicy = config.retryPolicy ?? DEFAULT_RETRY_POLICY;

    const startedAt = performance.now();
    let attempt = 0;

    for (;;) {
      try {
        const response = await withTimeout(provider[method](request), timeoutMs);
        if (typeof response.content !== "string") {
          throw new InvalidResponseError(`Provider "${provider.name}" returned a response with a non-string content field.`);
        }
        return { ...response, executionTimeMs: performance.now() - startedAt };
      } catch (err) {
        const wrapped = toGatewayError(err, provider.name);
        const canRetry = attempt < retryPolicy.maxRetries && (wrapped instanceof ProviderTimeoutError || wrapped instanceof NetworkError);
        if (!canRetry) throw wrapped;
        attempt += 1;
        if (retryPolicy.backoffMs > 0) await sleep(retryPolicy.backoffMs);
      }
    }
  }
}
