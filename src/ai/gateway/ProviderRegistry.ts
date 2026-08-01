import { ConfigurationError } from "@/ai/utils/errors";
import type { AIProvider } from "@/ai/interfaces/AIProvider";
import type { ProviderConfiguration } from "@/ai/models/ProviderConfiguration";

interface RegistryEntry {
  provider: AIProvider;
  config: ProviderConfiguration;
  enabled: boolean;
}

export interface ActiveProvider {
  name: string;
  provider: AIProvider;
  config: ProviderConfiguration;
}

// Provider names are an open, dynamic set by requirement ("future
// providers via config alone") — unlike CoachIntent's closed 16-key union
// (see RESPONDER_REGISTRY in the finance AI Coach engine), a Record can't
// support runtime register/remove, so this is a Map-backed class instead.
export class ProviderRegistry {
  private entries = new Map<string, RegistryEntry>();
  private activeName: string | null = null;

  register(name: string, provider: AIProvider, config: ProviderConfiguration): void {
    if (this.entries.has(name)) {
      throw new ConfigurationError(`A provider named "${name}" is already registered.`);
    }
    this.entries.set(name, { provider, config, enabled: false });
  }

  remove(name: string): void {
    if (!this.entries.has(name)) {
      throw new ConfigurationError(`No provider named "${name}" is registered.`);
    }
    this.entries.delete(name);
    if (this.activeName === name) this.activeName = null;
  }

  enable(name: string): void {
    const entry = this.requireEntry(name);
    entry.enabled = true;
  }

  disable(name: string): void {
    const entry = this.requireEntry(name);
    entry.enabled = false;
    if (this.activeName === name) this.activeName = null;
  }

  // The active provider must already be enabled — enable() before
  // setActive(), not the other way around, so a provider can never become
  // active while disabled.
  setActive(name: string): void {
    const entry = this.requireEntry(name);
    if (!entry.enabled) {
      throw new ConfigurationError(`Provider "${name}" must be enabled before it can be made active.`);
    }
    this.activeName = name;
  }

  getActive(): ActiveProvider | null {
    if (this.activeName === null) return null;
    const entry = this.entries.get(this.activeName);
    // The active provider was removed/disabled through some path other
    // than remove()/disable() above — treat it the same as "no active
    // provider" rather than returning a stale entry.
    if (!entry || !entry.enabled) return null;
    return { name: this.activeName, provider: entry.provider, config: entry.config };
  }

  get(name: string): RegistryEntry | null {
    return this.entries.get(name) ?? null;
  }

  list(): string[] {
    return [...this.entries.keys()];
  }

  private requireEntry(name: string): RegistryEntry {
    const entry = this.entries.get(name);
    if (!entry) throw new ConfigurationError(`No provider named "${name}" is registered.`);
    return entry;
  }
}
