import type { AIContext } from "@/ai/models/AIContext";

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  context?: AIContext;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
  sessionId?: string;
}
