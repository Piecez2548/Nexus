import { describe, expect, it } from "vitest";
import { ProviderFactory } from "./ProviderFactory";
import { LocalRuleProvider } from "./LocalRuleProvider";
import { ConfigurationError } from "@/ai/utils/errors";

describe("ProviderFactory.create", () => {
  it("creates a real, usable LocalRuleProvider for \"local-rule\"", async () => {
    const provider = ProviderFactory.create({ providerName: "local-rule" });
    expect(provider).toBeInstanceOf(LocalRuleProvider);
    expect(provider.name).toBe("local-rule");
    await expect(provider.isAvailable()).resolves.toBe(true);
  });

  it.each(["claude", "openai", "gemini", "ollama"])("throws ConfigurationError for the known-but-unimplemented provider \"%s\"", (providerName) => {
    expect(() => ProviderFactory.create({ providerName })).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError for a completely unknown provider name", () => {
    expect(() => ProviderFactory.create({ providerName: "not-a-real-provider" })).toThrow(ConfigurationError);
  });
});
