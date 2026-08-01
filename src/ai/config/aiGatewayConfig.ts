import { DEFAULT_TIMEOUT_MS } from "@/ai/models/ProviderConfiguration";
import type { ProviderConfiguration } from "@/ai/models/ProviderConfiguration";

// Reads Vite's env vars fresh on every call — deliberately a function, not
// a module-level const like src/lib/supabaseClient.ts's pattern, so this
// can be unit-tested with different vi.stubEnv() values per test case.
// Defaults to the local-rule provider when VITE_AI_PROVIDER is unset, so
// the Gateway always has a working default without requiring any env
// configuration at all.
export function loadAiGatewayConfig(): ProviderConfiguration {
  const env = import.meta.env;

  const providerName = env.VITE_AI_PROVIDER || "local-rule";
  const apiKey = env.VITE_AI_API_KEY || undefined;
  const endpoint = env.VITE_AI_ENDPOINT || undefined;
  const model = env.VITE_AI_MODEL || undefined;

  const parsedTimeout = Number(env.VITE_AI_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : DEFAULT_TIMEOUT_MS;

  return { providerName, apiKey, endpoint, model, timeoutMs };
}
