// Real, remote AIProvider backed by Anthropic Claude, reached exclusively
// through the "ai-coach" Supabase Edge Function
// (supabase/functions/ai-coach/index.ts) -- this file never talks to
// api.anthropic.com directly and never sees ANTHROPIC_API_KEY, which lives
// only as that Edge Function's own secret. That's also why
// initialize()/isAvailable() do no network probing of their own:
// "available" here means "the Supabase client exists to route through",
// not "Anthropic is currently reachable" -- the real reachability check
// only happens on the first actual chat() call.
//
// Scope: chat() only. analyze()/summarize()/generateRecommendations() throw
// ConfigurationError -- nothing calls them today (only AiCoachSection.tsx's
// "unknown" intent path calls chat()); adding a real implementation later is
// a one-method addition mirroring chat(), not a redesign.

import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { AuthenticationError, ConfigurationError, NetworkError, ProviderUnavailableError } from "@/ai/utils/errors";
import type { AIProvider } from "@/ai/interfaces/AIProvider";
import type { AIRequest } from "@/ai/models/AIRequest";
import type { AIResponse } from "@/ai/models/AIResponse";
import type { ProviderConfiguration } from "@/ai/models/ProviderConfiguration";

interface AiCoachFunctionResponse {
  text: string;
  tokensUsed?: { input: number; output: number };
}

const NOT_SUPPORTED_SUFFIX = "not supported by ClaudeProvider yet -- only chat() routes through the ai-coach Edge Function today.";

export class ClaudeProvider implements AIProvider {
  readonly name = "claude";

  // async so a misconfigured-Supabase throw becomes a proper rejected
  // Promise (matching AIProvider's Promise<void> contract and
  // LocalRuleProvider's own convention) rather than a synchronous throw a
  // promise-chaining caller's .catch() would never see.
  async initialize(_config: ProviderConfiguration): Promise<void> {
    if (!supabase) {
      throw new ConfigurationError(
        "ClaudeProvider requires Supabase to be configured (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY) -- it routes every call through the ai-coach Edge Function."
      );
    }
  }

  isAvailable(): Promise<boolean> {
    // Cheap by design (see file header) -- never a network call.
    return Promise.resolve(supabase !== null);
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    if (!supabase) {
      throw new ProviderUnavailableError("ClaudeProvider has no Supabase client -- cloud sync is not configured.");
    }

    const language = request.metadata?.language === "th" ? "th" : "en";
    const startedAt = performance.now();

    const { data, error, response } = await supabase.functions.invoke<AiCoachFunctionResponse>("ai-coach", {
      body: {
        questionText: request.prompt,
        context: request.context?.data ?? {},
        language,
      },
    });

    if (error) throw this.mapInvokeError(error, response);
    if (!data || typeof data.text !== "string") {
      throw new NetworkError("The ai-coach Edge Function returned an unexpected response shape.");
    }

    return {
      content: data.text,
      // Claude doesn't self-report a confidence score the way the local
      // rule engine does -- a fixed mid-value signals "a real answer, but
      // not measured the same way as the local path" rather than
      // fabricating false precision. AiCoachSection.tsx/AiCoachAnswerCard.tsx
      // hide the confidence line entirely for LLM-sourced answers anyway.
      confidence: 60,
      provider: this.name,
      executionTimeMs: performance.now() - startedAt,
      tokenUsage: data.tokensUsed
        ? {
            promptTokens: data.tokensUsed.input,
            completionTokens: data.tokensUsed.output,
            totalTokens: data.tokensUsed.input + data.tokensUsed.output,
          }
        : undefined,
    };
  }

  // All three async, same reasoning as initialize() above.
  async analyze(): Promise<AIResponse> {
    throw new ConfigurationError(`analyze() is ${NOT_SUPPORTED_SUFFIX}`);
  }

  async summarize(): Promise<AIResponse> {
    throw new ConfigurationError(`summarize() is ${NOT_SUPPORTED_SUFFIX}`);
  }

  async generateRecommendations(): Promise<AIResponse> {
    throw new ConfigurationError(`generateRecommendations() is ${NOT_SUPPORTED_SUFFIX}`);
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  private mapInvokeError(error: FunctionsHttpError | FunctionsRelayError | FunctionsFetchError | Error, response?: Response): Error {
    if (error instanceof FunctionsHttpError) {
      const status = response?.status;
      if (status === 401) {
        return new AuthenticationError("The ai-coach Edge Function rejected the request as unauthenticated.", { cause: error });
      }
      if (status === 429) {
        return new ProviderUnavailableError("The AI Coach daily request limit has been reached.", { cause: error });
      }
      return new NetworkError(`The ai-coach Edge Function returned an error response (status ${status ?? "unknown"}).`, { cause: error });
    }
    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      return new NetworkError(`Could not reach the ai-coach Edge Function: ${error.message}`, { cause: error });
    }
    return new NetworkError(`Unexpected error invoking the ai-coach Edge Function: ${error.message}`, { cause: error });
  }
}
