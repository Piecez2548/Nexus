import { ListChecks } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import type { ActionPlan } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";
import type { RecommendationMessage } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

interface Props {
  result: ActionPlan;
}

const BUCKETS: { key: keyof ActionPlan; labelKey: string }[] = [
  { key: "immediate", labelKey: "aiAnalytics.executiveSummaryReport.actionPlan.immediate" },
  { key: "weekly", labelKey: "aiAnalytics.executiveSummaryReport.actionPlan.weekly" },
  { key: "monthly", labelKey: "aiAnalytics.executiveSummaryReport.actionPlan.monthly" },
  { key: "longTerm", labelKey: "aiAnalytics.executiveSummaryReport.actionPlan.longTerm" },
];

function Bucket({ labelKey, items }: { labelKey: string; items: RecommendationMessage[] }) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t(labelKey)}</h4>
      <ul className="space-y-1">
        {items.map((m, i) => (
          <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400">
            • {t(m.key, m.params)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ActionPlanPanel({ result }: Props) {
  const { t } = useTranslation();
  const hasAny = BUCKETS.some((b) => result[b.key].length > 0);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <ListChecks size={18} className="text-blue-500" />
        <h3 className="text-sm font-semibold">{t("aiAnalytics.executiveSummaryReport.actionPlan.title")}</h3>
      </div>

      {!hasAny ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.executiveSummaryReport.actionPlan.empty")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {BUCKETS.map((b) => (
            <Bucket key={b.key} labelKey={b.labelKey} items={result[b.key]} />
          ))}
        </div>
      )}
    </div>
  );
}
