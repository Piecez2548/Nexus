// Provider Configuration — one shape shared by every provider (local or
// remote). Only the fields a given provider actually needs get populated;
// the rest stay undefined (LocalRuleProvider needs none of apiKey/endpoint/
// model — a future ClaudeProvider would need all three). `extra` is the
// spec's "Future Settings" escape hatch, kept as a named field rather than
// an index signature so property access on the typed fields stays
// typo-safe.

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
}

export interface ProviderConfiguration {
  providerName: string;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
  retryPolicy?: RetryPolicy;
  temperature?: number;
  extra?: Record<string, unknown>;
}

// Shared by gateway/AIGateway.ts's timeout fallback and
// config/aiGatewayConfig.ts's default, so the two can never drift apart.
export const DEFAULT_TIMEOUT_MS = 30_000;

// No retries unless a provider's own config explicitly opts in.
export const DEFAULT_RETRY_POLICY: RetryPolicy = { maxRetries: 0, backoffMs: 0 };
