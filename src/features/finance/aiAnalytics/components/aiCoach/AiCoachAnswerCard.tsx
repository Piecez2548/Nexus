import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import type { CoachResponse, CoachSuggestion } from "@/features/finance/aiAnalytics/engine/coach/types";

interface Props {
  response: CoachResponse;
  onSuggestionClick: (suggestion: CoachSuggestion) => void;
}

const MAX_VISIBLE_METRICS = 4;

// Most supportingMetrics keys are fixed field names (translated via
// metricLabels.*), but categorySpendingResponder.ts uses literal category
// names as keys — those have no i18n entry, so fall back to the raw key
// itself (already human-readable) rather than showing an unresolved
// "aiAnalytics.aiCoach.metricLabels.xxx" path.
function metricLabel(key: string, t: ReturnType<typeof useTranslation>["t"]): string {
  const i18nKey = `aiAnalytics.aiCoach.metricLabels.${key}`;
  const translated = t(i18nKey);
  return translated === i18nKey ? key : translated;
}

export default function AiCoachAnswerCard({ response, onSuggestionClick }: Props) {
  const { t } = useTranslation();
  const metrics = Object.entries(response.supportingMetrics).slice(0, MAX_VISIBLE_METRICS);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <p className="text-sm font-medium">{t(response.answer.key, response.answer.params)}</p>

      {metrics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {metrics.map(([key, value]) => (
            <span key={key} className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-300">
              {metricLabel(key, t)}: <span className="font-semibold">{value}</span>
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{t(response.reason.key, response.reason.params)}</p>

      {response.source === "llm" ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-violet-500 dark:text-violet-400">
          <Sparkles size={12} />
          {t("aiAnalytics.aiCoach.llmBadge")}
        </p>
      ) : (
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">{t("aiAnalytics.aiCoach.confidence", { value: response.confidence })}</p>
      )}

      {response.relatedRecommendations.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          {response.relatedRecommendations.map((rec) => (
            <p key={rec.id} className="text-xs text-zinc-600 dark:text-zinc-300">
              {t(rec.title.key, rec.title.params)}
            </p>
          ))}
        </div>
      )}

      {response.nextSuggestedQuestion && (
        <button
          type="button"
          onClick={() => onSuggestionClick(response.nextSuggestedQuestion!)}
          className="mt-3 flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-brand-600 dark:text-brand-400 transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          {t(response.nextSuggestedQuestion.prompt.key)}
          <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}
