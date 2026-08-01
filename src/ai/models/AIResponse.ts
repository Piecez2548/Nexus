// `content` is always plain, already-resolved text — what a real Claude/
// OpenAI/Gemini response naturally is. LocalRuleProvider cannot put fully
// translated prose here (this whole subsystem is React/i18n-independent,
// see providers/LocalRuleProvider.ts's own file header) — it fills
// `content` with a plain structural descriptor instead, and puts the full,
// still-i18n-keyed structured result in `metadata.result`.

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIResponse {
  content: string;
  confidence: number;
  provider: string;
  executionTimeMs: number;
  tokenUsage?: TokenUsage;
  metadata?: Record<string, unknown>;
}
