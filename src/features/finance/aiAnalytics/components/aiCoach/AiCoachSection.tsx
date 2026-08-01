import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { computeCoachResponse } from "@/features/finance/aiAnalytics/engine/coach/engine/askCoach";
import { EXAMPLE_QUESTION_KEY_BY_INTENT } from "@/features/finance/aiAnalytics/engine/coach/constants/nextQuestionMap";
import AiCoachInput from "@/features/finance/aiAnalytics/components/aiCoach/AiCoachInput";
import AiCoachMessageList from "@/features/finance/aiAnalytics/components/aiCoach/AiCoachMessageList";
import type { CoachExchange } from "@/features/finance/aiAnalytics/components/aiCoach/types";
import type { CoachIntent, CoachSuggestion } from "@/features/finance/aiAnalytics/engine/coach/types";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";

interface Props {
  data: FinancialAnalysisResult;
}

// The most-generally-useful starting points for a first-time question, not
// an exhaustive list of all 16 intents — mirrors INTENT_PRIORITY_ORDER's
// own "most-generally-useful first" ordering, taking just its top picks.
const STARTER_INTENTS: CoachIntent[] = ["financialOverview", "budgetStatus", "forecast", "recommendations"];

export default function AiCoachSection({ data }: Props) {
  const { t } = useTranslation();
  const [exchanges, setExchanges] = useState<CoachExchange[]>([]);

  function ask(questionText: string) {
    const response = computeCoachResponse({ data, questionText });
    setExchanges((prev) => [...prev, { id: crypto.randomUUID(), question: questionText, response }]);
  }

  function handleSuggestionClick(suggestion: CoachSuggestion) {
    ask(t(suggestion.prompt.key));
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
                  onClick={() => ask(t(EXAMPLE_QUESTION_KEY_BY_INTENT[intent]))}
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

        <AiCoachInput onSubmit={ask} />
      </div>
    </div>
  );
}
