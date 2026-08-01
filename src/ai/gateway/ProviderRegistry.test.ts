import { describe, expect, it } from "vitest";
import { ProviderRegistry } from "./ProviderRegistry";
import { ConfigurationError } from "@/ai/utils/errors";
import type { AIProvider } from "@/ai/interfaces/AIProvider";
import type { ProviderConfiguration } from "@/ai/models/ProviderConfiguration";
import type { AIResponse } from "@/ai/models/AIResponse";

function fakeResponse(): AIResponse {
  return { content: "ok", confidence: 100, provider: "fake", executionTimeMs: 0 };
}

function fakeProvider(name: string): AIProvider {
  return {
    name,
    initialize: () => Promise.resolve(),
    isAvailable: () => Promise.resolve(true),
    analyze: () => Promise.resolve(fakeResponse()),
    summarize: () => Promise.resolve(fakeResponse()),
    chat: () => Promise.resolve(fakeResponse()),
    generateRecommendations: () => Promise.resolve(fakeResponse()),
    shutdown: () => Promise.resolve(),
  };
}

function fakeConfig(providerName: string): ProviderConfiguration {
  return { providerName };
}

describe("ProviderRegistry — registration and listing", () => {
  it("registers a provider and lists its name", () => {
    const registry = new ProviderRegistry();
    registry.register("local-rule", fakeProvider("local-rule"), fakeConfig("local-rule"));
    expect(registry.list()).toEqual(["local-rule"]);
    expect(registry.get("local-rule")?.provider.name).toBe("local-rule");
  });

  it("throws ConfigurationError registering a duplicate name", () => {
    const registry = new ProviderRegistry();
    registry.register("local-rule", fakeProvider("local-rule"), fakeConfig("local-rule"));
    expect(() => registry.register("local-rule", fakeProvider("local-rule"), fakeConfig("local-rule"))).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError removing an unknown name", () => {
    const registry = new ProviderRegistry();
    expect(() => registry.remove("nope")).toThrow(ConfigurationError);
  });

  it("get() returns null for an unknown name", () => {
    const registry = new ProviderRegistry();
    expect(registry.get("nope")).toBeNull();
  });
});

describe("ProviderRegistry — enable/disable/setActive", () => {
  it("throws ConfigurationError enabling/disabling/activating an unknown name", () => {
    const registry = new ProviderRegistry();
    expect(() => registry.enable("nope")).toThrow(ConfigurationError);
    expect(() => registry.disable("nope")).toThrow(ConfigurationError);
    expect(() => registry.setActive("nope")).toThrow(ConfigurationError);
  });

  it("refuses to activate a provider that hasn't been enabled", () => {
    const registry = new ProviderRegistry();
    registry.register("local-rule", fakeProvider("local-rule"), fakeConfig("local-rule"));
    expect(() => registry.setActive("local-rule")).toThrow(ConfigurationError);
    expect(registry.getActive()).toBeNull();
  });

  it("getActive() is null until a provider is both enabled and set active", () => {
    const registry = new ProviderRegistry();
    registry.register("local-rule", fakeProvider("local-rule"), fakeConfig("local-rule"));
    expect(registry.getActive()).toBeNull();

    registry.enable("local-rule");
    expect(registry.getActive()).toBeNull(); // enabled, but not yet active

    registry.setActive("local-rule");
    const active = registry.getActive();
    expect(active?.name).toBe("local-rule");
    expect(active?.provider.name).toBe("local-rule");
  });

  it("disabling the active provider clears active back to null", () => {
    const registry = new ProviderRegistry();
    registry.register("local-rule", fakeProvider("local-rule"), fakeConfig("local-rule"));
    registry.enable("local-rule");
    registry.setActive("local-rule");

    registry.disable("local-rule");
    expect(registry.getActive()).toBeNull();
  });

  it("removing the active provider clears active back to null", () => {
    const registry = new ProviderRegistry();
    registry.register("local-rule", fakeProvider("local-rule"), fakeConfig("local-rule"));
    registry.enable("local-rule");
    registry.setActive("local-rule");

    registry.remove("local-rule");
    expect(registry.getActive()).toBeNull();
    expect(registry.list()).toEqual([]);
  });

  it("removing a non-active provider leaves the active one untouched", () => {
    const registry = new ProviderRegistry();
    registry.register("local-rule", fakeProvider("local-rule"), fakeConfig("local-rule"));
    registry.register("claude", fakeProvider("claude"), fakeConfig("claude"));
    registry.enable("local-rule");
    registry.setActive("local-rule");

    registry.remove("claude");
    expect(registry.getActive()?.name).toBe("local-rule");
  });

  it("switching setActive between two enabled providers works", () => {
    const registry = new ProviderRegistry();
    registry.register("local-rule", fakeProvider("local-rule"), fakeConfig("local-rule"));
    registry.register("claude", fakeProvider("claude"), fakeConfig("claude"));
    registry.enable("local-rule");
    registry.enable("claude");

    registry.setActive("local-rule");
    expect(registry.getActive()?.name).toBe("local-rule");

    registry.setActive("claude");
    expect(registry.getActive()?.name).toBe("claude");
  });
});
