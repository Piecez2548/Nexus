// The composition root: config -> provider -> registry -> gateway, all
// synchronous (no top-level await), producing a ready-to-use singleton.
// Future consumers (Trading, Portfolio, Finance) would import `aiGateway`
// from here directly — e.g. `import { aiGateway } from "@/ai/services/
// aiGatewayService"` — rather than constructing their own Gateway/Registry.
// Nothing imports this yet: per this prompt's locked scope, existing
// consumers stay on their current direct-engine-call paths.

import { loadAiGatewayConfig } from "@/ai/config/aiGatewayConfig";
import { AIGateway } from "@/ai/gateway/AIGateway";
import { ProviderRegistry } from "@/ai/gateway/ProviderRegistry";
import { ProviderFactory } from "@/ai/providers/ProviderFactory";

const config = loadAiGatewayConfig();
const provider = ProviderFactory.create(config);

const registry = new ProviderRegistry();
registry.register(config.providerName, provider, config);
registry.enable(config.providerName);
registry.setActive(config.providerName);

export const aiGateway = new AIGateway(registry);
