import { describe, expect, it } from "vitest";
import { ProviderFactory } from "./ProviderFactory";
import { LocalRuleProvider } from "./LocalRuleProvider";
import { ClaudeProvider } from "./ClaudeProvider";
import { ConfigurationError } from "@/ai/utils/errors";

describe("ProviderFactory.create", () => {
  it("creates a real, usable LocalRuleProvider for \"local-rule\"", async () => {
    const provider = ProviderFactory.create({ providerName: "local-rule" });
    expect(provider).toBeInstanceOf(LocalRuleProvider);
    expect(provider.name).toBe("local-rule");
    await expect(provider.isAvailable()).resolves.toBe(true);
  });

  it("creates a real, usable ClaudeProvider for \"claude\"", async () => {
    const provider = ProviderFactory.create({ providerName: "claude" });
    expect(provider).toBeInstanceOf(ClaudeProvider);
    expect(provider.name).toBe("claude");
    // isAvailable() never makes a network call (see ClaudeProvider's own
    // file header), so this assertion needs no supabaseClient mock.
    await expect(provider.isAvailable()).resolves.toEqual(expect.any(Boolean));
  });

  it.each(["openai", "gemini", "ollama"])("throws ConfigurationError for the known-but-unimplemented provider \"%s\"", (providerName) => {
    expect(() => ProviderFactory.create({ providerName })).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError for a completely unknown provider name", () => {
    expect(() => ProviderFactory.create({ providerName: "not-a-real-provider" })).toThrow(ConfigurationError);
  });
});
