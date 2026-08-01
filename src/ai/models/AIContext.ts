// Deliberately generic/open at this layer — the Gateway itself never knows
// about Finance/Trading/Portfolio-specific data shapes; that's the whole
// point of Dependency Inversion here. Only a concrete AIProvider
// implementation (e.g. providers/LocalRuleProvider.ts) is allowed to
// interpret `data` as a specific domain context type and cast it, after
// validating it looks like what it expects.

export interface AIContext {
  domain?: string;
  data?: Record<string, unknown>;
}
