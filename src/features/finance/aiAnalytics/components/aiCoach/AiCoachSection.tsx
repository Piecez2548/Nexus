import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { computeCoachResponse } from "@/features/finance/aiAnalytics/engine/coach/engine/askCoach";
import { buildCoachLlmContext } from "@/features/finance/aiAnalytics/engine/coach/context/buildCoachLlmContext";
import { EXAMPLE_QUESTION_KEY_BY_INTENT } from "@/features/finance/aiAnalytics/engine/coach/constants/nextQuestionMap";
import AiCoachInput from "@/features/finance/aiAnalytics/components/aiCoach/AiCoachInput";
import AiCoachMessageList from "@/features/finance/aiAnalytics/components/aiCoach/AiCoachMessageList";
import { aiGateway } from "@/ai/services/aiGatewayService";
import { AIGatewayError } from "@/ai/utils/errors";
import { isSyncConfigured } from "@/lib/supabaseClient";
import { useAuthStore } from "@/features/sync/store/authStore";
import { useAiCoachSettingsStore } from "@/store/aiCoachSettingsStore";
import type { CoachExchange } from "@/features/finance/aiAnalytics/components/aiCoach/types";
import type { CoachIntent, CoachResponse, CoachSuggestion } from "@/features/finance/aiAnalytics/engine/coach/types";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";

interface Props {
  data: FinancialAnalysisResult;
}

// The most-generally-useful starting points for a first-time question, not
// an exhaustive list of all 16 intents — mirrors INTENT_PRIORITY_ORDER's
// own "most-generally-useful first" ordering, taking just its top picks.
const STARTER_INTENTS: CoachIntent[] = ["financialOverview", "budgetStatus", "forecast", "recommendations"];

export default function AiCoachSection({ data }: Props) {
  const { t, language } = useTranslation();
  const [exchanges, setExchanges] = useState<CoachExchange[]>([]);
  const [loading, setLoading] = useState(false);
  const aiCoachEnabled = useAiCoachSettingsStore((s) => s.enabled);
  const authUser = useAuthStore((s) => s.user);

  // Three independent gates, all required: the user opted in (Settings),
  // cloud sync is actually configured for this build (VITE_SUPABASE_*),
  // and the user is actually signed in (an unsigned-in call would just
  // hit the Edge Function's 401 path for no benefit — see the Edge
  // Function's own JWT check).
  const llmFallbackAvailable = aiCoachEnabled && isSyncConfigured && authUser !== null;

  async function askLlmFallback(questionText: string, ruleResponse: CoachResponse): Promise<CoachResponse> {
    try {
      const llmResponse = await aiGateway.chat({
        prompt: questionText,
        context: { domain: "finance.aiCoach", data: buildCoachLlmContext(data) as unknown as Record<string, unknown> },
        metadata: { language },
      });

      return {
        intent: "unknown",
        // Raw LLM prose goes directly into answer.key -- this exploits the
        // exact same "unresolved key falls back to the key itself"
        // behavior AiCoachAnswerCard.tsx's own metricLabel() already
        // relies on (see useTranslation.ts's t(): if the lookup isn't a
        // string, it returns the key verbatim), so no rendering changes
        // are needed for the answer text itself.
        answer: { key: llmResponse.content, params: {} },
        supportingMetrics: {},
        reason: { key: "aiAnalytics.aiCoach.llmDisclaimer", params: {} },
        confidence: llmResponse.confidence,
        relatedRecommendations: [],
        nextSuggestedQuestion: null,
        source: "llm",
      };
    } catch (err) {
      // Any Gateway-normalized failure (rate-limited, unauthenticated,
      // network, Edge Function misconfigured, etc.) falls back to today's
      // static "I don't understand" response -- never a crash, never a
      // blank answer.
      if (err instanceof AIGatewayError) return ruleResponse;
      throw err;
    }
  }

  async function ask(questionText: string) {
    const ruleResponse = computeCoachResponse({ data, questionText });

    if (ruleResponse.intent !== "unknown" || !llmFallbackAvailable) {
      setExchanges((prev) => [...prev, { id: crypto.randomUUID(), question: questionText, response: ruleResponse }]);
      return;
    }

    setLoading(true);
    try {
      const finalResponse = await askLlmFallback(questionText, ruleResponse);
      setExchanges((prev) => [...prev, { id: crypto.randomUUID(), question: questionText, response: finalResponse }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestionClick(suggestion: CoachSuggestion) {
    void ask(t(suggestion.prompt.key));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={20} className="text-violet-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.aiCoach.title")}</h2>
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        {exchanges.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.aiCoach.emptyState")}</p>
            <div className="flex flex-wrap gap-2">
              {STARTER_INTENTS.map((intent) => (
                <button
                  key={intent}
                  type="button"
                  onClick={() => void ask(t(EXAMPLE_QUESTION_KEY_BY_INTENT[intent]))}
                  className="rounded-full border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  {t(EXAMPLE_QUESTION_KEY_BY_INTENT[intent])}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AiCoachMessageList exchanges={exchanges} onSuggestionClick={handleSuggestionClick} />
        )}

        <AiCoachInput onSubmit={(question) => void ask(question)} disabled={loading} />
      </div>
    </div>
  );
}
