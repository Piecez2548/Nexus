import type { AIRequest } from "@/ai/models/AIRequest";
import type { AIResponse } from "@/ai/models/AIResponse";
import type { ProviderConfiguration } from "@/ai/models/ProviderConfiguration";

// The contract every AI provider (local or remote) must satisfy.
// AIGateway/ProviderRegistry/ProviderFactory only ever depend on this
// interface, never on a concrete provider — that's what lets a provider be
// swapped through configuration alone.
export interface AIProvider {
  readonly name: string;

  // Called once, lazily, before this provider's first use — see
  // gateway/AIGateway.ts's dispatch(). May throw ConfigurationError or
  // AuthenticationError (e.g. a remote provider rejecting its API key).
  initialize(config: ProviderConfiguration): Promise<void>;

  // Never throws — a provider reports its own readiness rather than
  // forcing every caller to wrap every call in a try/catch just to probe
  // availability.
  isAvailable(): Promise<boolean>;

  // May throw ConfigurationError (malformed request/context),
  // InvalidResponseError, ProviderTimeoutError, NetworkError, or
  // AuthenticationError.
  analyze(request: AIRequest): Promise<AIResponse>;
  summarize(request: AIRequest): Promise<AIResponse>;
  chat(request: AIRequest): Promise<AIResponse>;
  generateRecommendations(request: AIRequest): Promise<AIResponse>;

  // Releases any held resources (connections, timers). Idempotent — safe
  // to call even if initialize() was never called or already shut down.
  shutdown(): Promise<void>;
}
