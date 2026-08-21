import { afterEach, describe, expect, it, vi } from "vitest";
import { loadAiGatewayConfig } from "./aiGatewayConfig";
import { DEFAULT_TIMEOUT_MS } from "@/ai/models/ProviderConfiguration";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadAiGatewayConfig", () => {
  it("defaults to the local-rule provider with the default timeout when nothing is configured", () => {
    // Explicitly stubbed, not just relying on ambient env -- a developer's
    // own .env.local (e.g. VITE_AI_PROVIDER=claude, set for local AI Coach
    // testing) must never change what "nothing is configured" means here.
    vi.stubEnv("VITE_AI_PROVIDER", "");
    vi.stubEnv("VITE_AI_API_KEY", "");
    vi.stubEnv("VITE_AI_ENDPOINT", "");
    vi.stubEnv("VITE_AI_MODEL", "");

    const config = loadAiGatewayConfig();
    expect(config.providerName).toBe("local-rule");
    expect(config.timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
    expect(config.apiKey).toBeUndefined();
    expect(config.endpoint).toBeUndefined();
    expect(config.model).toBeUndefined();
  });

  it("reads VITE_AI_PROVIDER/API_KEY/ENDPOINT/MODEL when set", () => {
    vi.stubEnv("VITE_AI_PROVIDER", "claude");
    vi.stubEnv("VITE_AI_API_KEY", "sk-test");
    vi.stubEnv("VITE_AI_ENDPOINT", "https://api.example.com");
    vi.stubEnv("VITE_AI_MODEL", "claude-test");

    const config = loadAiGatewayConfig();
    expect(config.providerName).toBe("claude");
    expect(config.apiKey).toBe("sk-test");
    expect(config.endpoint).toBe("https://api.example.com");
    expect(config.model).toBe("claude-test");
  });

  it("parses a numeric VITE_AI_TIMEOUT_MS", () => {
    vi.stubEnv("VITE_AI_TIMEOUT_MS", "5000");
    expect(loadAiGatewayConfig().timeoutMs).toBe(5000);
  });

  it("falls back to the default timeout when VITE_AI_TIMEOUT_MS is unset, zero, negative, or garbage", () => {
    vi.stubEnv("VITE_AI_TIMEOUT_MS", "not-a-number");
    expect(loadAiGatewayConfig().timeoutMs).toBe(DEFAULT_TIMEOUT_MS);

    vi.stubEnv("VITE_AI_TIMEOUT_MS", "0");
    expect(loadAiGatewayConfig().timeoutMs).toBe(DEFAULT_TIMEOUT_MS);

    vi.stubEnv("VITE_AI_TIMEOUT_MS", "-100");
    expect(loadAiGatewayConfig().timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
  });
});
