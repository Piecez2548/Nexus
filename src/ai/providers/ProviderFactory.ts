import { LocalRuleProvider } from "@/ai/providers/LocalRuleProvider";
import { ConfigurationError } from "@/ai/utils/errors";
import type { AIProvider } from "@/ai/interfaces/AIProvider";
import type { ProviderConfiguration } from "@/ai/models/ProviderConfiguration";

// Known future provider names — documented here so "provider-agnostic
// architecture, configurable alone" is a visible, honest intent even
// though only "local-rule" is actually implemented today. Building four
// empty ClaudeProvider/OpenAIProvider/GeminiProvider/OllamaProvider
// classes that do nothing would be fabricated dead code; adding a real one
// later is a one-case addition to create() below, nothing else changes.
const KNOWN_FUTURE_PROVIDER_NAMES = ["claude", "openai", "gemini", "ollama"] as const;

export const ProviderFactory = {
  create(config: ProviderConfiguration): AIProvider {
    if (config.providerName === "local-rule") {
      return new LocalRuleProvider();
    }

    if ((KNOWN_FUTURE_PROVIDER_NAMES as readonly string[]).includes(config.providerName)) {
      throw new ConfigurationError(`Provider "${config.providerName}" is a known future provider but isn't implemented yet.`);
    }

    throw new ConfigurationError(`Unknown AI provider "${config.providerName}".`);
  },
};
