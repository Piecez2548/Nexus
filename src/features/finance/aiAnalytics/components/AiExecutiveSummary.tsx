import { Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import type { ExecutiveSummaryPart } from "@/features/finance/aiAnalytics/engine/analyzers/executiveSummary";

interface Props {
  parts: ExecutiveSummaryPart[];
}

export default function AiExecutiveSummary({ parts }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={20} className="text-violet-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.executiveSummary.title")}</h2>
      </div>

      {parts.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.executiveSummary.empty")}</p>
      ) : (
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {parts
            .map((part) => {
              // grade is an enum id (e.g. "excellent"), not display text —
              // resolved through its own i18n namespace before interpolation,
              // same pattern BehaviorAnalysisSection uses for weekday names.
              const params = part.key === "overallHealth" ? { ...part.params, grade: t(`aiAnalytics.healthScore.grades.${part.params.grade}`) } : part.params;
              return t(`aiAnalytics.executiveSummary.parts.${part.key}`, params);
            })
            .join(" ")}
        </p>
      )}
    </div>
  );
}
