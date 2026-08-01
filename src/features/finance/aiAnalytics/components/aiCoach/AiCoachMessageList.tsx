import AiCoachAnswerCard from "@/features/finance/aiAnalytics/components/aiCoach/AiCoachAnswerCard";
import type { CoachExchange } from "@/features/finance/aiAnalytics/components/aiCoach/types";
import type { CoachSuggestion } from "@/features/finance/aiAnalytics/engine/coach/types";

interface Props {
  exchanges: CoachExchange[];
  onSuggestionClick: (suggestion: CoachSuggestion) => void;
}

export default function AiCoachMessageList({ exchanges, onSuggestionClick }: Props) {
  return (
    <div className="space-y-4">
      {exchanges.map((exchange) => (
        <div key={exchange.id} className="space-y-2">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{exchange.question}</p>
          <AiCoachAnswerCard response={exchange.response} onSuggestionClick={onSuggestionClick} />
        </div>
      ))}
    </div>
  );
}
