// Public barrel for the AI Gateway subsystem.
//
// STATUS (as of the P012/P013 architecture review): intentionally parked,
// not wired into the running app. Every real AI Analytics feature
// (useFinancialAnalysis.ts, AiCoachSection.tsx) still calls its local
// statistical engine directly, bypassing this Gateway entirely — see
// services/aiGatewayService.ts's own header comment. This was a deliberate
// decision, not an oversight: wiring a real feature to dispatch through
// `aiGateway` instead of calling its engine directly is a genuine runtime
// behavior change (a new AI-dispatch path), not a refactor — it belongs in
// its own dedicated prompt, ideally alongside the first real non-local
// provider this Gateway would actually route to. Until then, this
// subsystem stays here as a ready, tested seam, not dead code to delete.

export * from "@/ai/models/AIRequest";
export * from "@/ai/models/AIResponse";
export * from "@/ai/models/AIContext";
export * from "@/ai/models/ProviderConfiguration";
export * from "@/ai/interfaces/AIProvider";
export * from "@/ai/utils/errors";
export * from "@/ai/gateway/ProviderRegistry";
export * from "@/ai/gateway/AIGateway";
export * from "@/ai/providers/LocalRuleProvider";
export * from "@/ai/providers/ProviderFactory";
export * from "@/ai/config/aiGatewayConfig";
export * from "@/ai/services/aiGatewayService";
