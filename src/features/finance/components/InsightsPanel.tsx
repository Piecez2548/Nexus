import { Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import type { SpendingInsight } from "@/features/finance/hooks/useSpendingInsights";

interface Props {
  insights: SpendingInsight[];
}

export default function InsightsPanel({ insights }: Props) {
  const { t } = useTranslation();
  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={20} className="text-amber-400" />
        <h2 className="text-xl font-semibold">{t("dashboard.aiAnalytics")}</h2>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-300"
          >
            {insight.message}
          </div>
        ))}
      </div>
    </div>
  );
}
