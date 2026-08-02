import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useWhatIfScenario } from "@/features/finance/aiAnalytics/hooks/useWhatIfScenario";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { SubscriptionEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { WhatIfResult, WhatIfScenarioInput } from "@/features/finance/aiAnalytics/engine/forecast/types";

interface Props {
  goalProgress: GoalProgressEntry[];
  spendingAnalysis: SpendingAnalysisResult;
  subscriptions: SubscriptionEntry[];
  now: Date;
}

type ScenarioType = WhatIfScenarioInput["type"];

const SCENARIO_TYPES: ScenarioType[] = ["reduceFoodSpending", "increaseGoalSavings", "cancelSubscriptions", "reduceCoffeeSpending"];
// reduceCoffeeSpending re-runs 5 analyzers twice per call internally (see
// scenarioPipelineRunner.ts) — a live-dragging slider would visibly lag on
// a real account, so this one scenario type uses stepped buttons instead
// of a free number input. The other 3 scenario types are cheap, pure
// arithmetic and stay wired directly.
const COFFEE_REDUCTION_STEPS = [10, 25, 50, 75, 100];

function WhatIfResultDisplay({ result }: { result: WhatIfResult }) {
  const { t } = useTranslation();

  if (result.type === "reduceFoodSpending" || result.type === "cancelSubscriptions") {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.whatIf.estimatedMonthlySavings")}</p>
          <p className="text-lg font-bold text-green-500">฿{Math.round(result.estimatedMonthlySavings).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.whatIf.estimatedYearlySavings")}</p>
          <p className="text-lg font-bold text-green-500">฿{Math.round(result.estimatedYearlySavings).toLocaleString()}</p>
        </div>
      </div>
    );
  }

  if (result.type === "increaseGoalSavings") {
    return (
      <div className="space-y-1 text-sm">
        <p>
          {result.estimatedCompletionDate === null
            ? t("aiAnalytics.forecast.whatIf.noEstimate")
            : t("aiAnalytics.forecast.whatIf.newCompletionDate", { date: result.estimatedCompletionDate })}
        </p>
        {result.monthsSaved !== null && result.monthsSaved > 0 && (
          <p className="font-medium text-green-500">{t("aiAnalytics.forecast.whatIf.monthsSaved", { count: result.monthsSaved })}</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 text-center">
      <div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.whatIf.baselineScore")}</p>
        <p className="text-lg font-bold">{result.baselineScore === null ? "—" : Math.round(result.baselineScore)}</p>
      </div>
      <div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.whatIf.projectedScore")}</p>
        <p className="text-lg font-bold text-green-500">{result.projectedScore === null ? "—" : Math.round(result.projectedScore)}</p>
      </div>
      <div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.whatIf.improvement")}</p>
        <p className="text-lg font-bold text-green-500">{result.estimatedScoreImprovement === null ? "—" : `+${Math.round(result.estimatedScoreImprovement)}`}</p>
      </div>
    </div>
  );
}

export default function WhatIfScenarioPanel({ goalProgress, spendingAnalysis, subscriptions, now }: Props) {
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState<ScenarioType>("reduceFoodSpending");

  const incompleteGoals = useMemo(() => goalProgress.filter((g) => !g.isComplete), [goalProgress]);

  const [reduceFoodPercent, setReduceFoodPercent] = useState(20);
  const [selectedGoalSyncId, setSelectedGoalSyncId] = useState<string | null>(null);
  const [additionalMonthlyAmount, setAdditionalMonthlyAmount] = useState(1000);
  const [selectedSubscriptionTitles, setSelectedSubscriptionTitles] = useState<string[]>([]);
  const [reduceCoffeePercent, setReduceCoffeePercent] = useState(25);

  const goalSyncId = selectedGoalSyncId ?? incompleteGoals[0]?.goal.syncId ?? null;

  const disabledByType: Record<ScenarioType, boolean> = {
    reduceFoodSpending: false,
    increaseGoalSavings: incompleteGoals.length === 0,
    cancelSubscriptions: subscriptions.length === 0,
    reduceCoffeeSpending: false,
  };

  const input: WhatIfScenarioInput | null = useMemo(() => {
    switch (activeType) {
      case "reduceFoodSpending":
        return { type: "reduceFoodSpending", reductionPercent: reduceFoodPercent };
      case "increaseGoalSavings":
        return goalSyncId === null ? null : { type: "increaseGoalSavings", goalSyncId, additionalMonthlyAmount };
      case "cancelSubscriptions":
        return selectedSubscriptionTitles.length === 0 ? null : { type: "cancelSubscriptions", normalizedTitles: selectedSubscriptionTitles };
      case "reduceCoffeeSpending":
        return { type: "reduceCoffeeSpending", reductionPercent: reduceCoffeePercent };
    }
  }, [activeType, reduceFoodPercent, goalSyncId, additionalMonthlyAmount, selectedSubscriptionTitles, reduceCoffeePercent]);

  const result = useWhatIfScenario(input, goalProgress, spendingAnalysis, subscriptions, now);

  function toggleSubscription(normalizedTitle: string) {
    setSelectedSubscriptionTitles((prev) => (prev.includes(normalizedTitle) ? prev.filter((title) => title !== normalizedTitle) : [...prev, normalizedTitle]));
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-violet-500" />
        <h3 className="text-sm font-semibold">{t("aiAnalytics.forecast.whatIf.title")}</h3>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {SCENARIO_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            disabled={disabledByType[type]}
            onClick={() => setActiveType(type)}
            aria-pressed={activeType === type}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              activeType === type
                ? "bg-brand-600 text-white"
                : disabledByType[type]
                  ? "cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {t(`aiAnalytics.forecast.whatIf.types.${type}`)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeType === "reduceFoodSpending" && (
          <label className="block text-sm">
            {t("aiAnalytics.forecast.whatIf.reductionPercent")}
            <input
              type="number"
              min={1}
              max={100}
              value={reduceFoodPercent}
              onChange={(e) => setReduceFoodPercent(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-2 text-sm outline-none focus:border-brand-500"
            />
          </label>
        )}

        {activeType === "increaseGoalSavings" &&
          (disabledByType.increaseGoalSavings ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.whatIf.noActiveGoals")}</p>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm">
                {t("aiAnalytics.forecast.whatIf.selectGoal")}
                <select
                  value={goalSyncId ?? ""}
                  onChange={(e) => setSelectedGoalSyncId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-2 text-sm outline-none focus:border-brand-500"
                >
                  {incompleteGoals.map((entry) => (
                    <option key={entry.goal.syncId} value={entry.goal.syncId}>
                      {entry.goal.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                {t("aiAnalytics.forecast.whatIf.additionalMonthlyAmount")}
                <input
                  type="number"
                  min={1}
                  value={additionalMonthlyAmount}
                  onChange={(e) => setAdditionalMonthlyAmount(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-2 text-sm outline-none focus:border-brand-500"
                />
              </label>
            </div>
          ))}

        {activeType === "cancelSubscriptions" &&
          (disabledByType.cancelSubscriptions ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.whatIf.noSubscriptions")}</p>
          ) : (
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <label key={sub.normalizedTitle} className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 p-2 text-sm">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedSubscriptionTitles.includes(sub.normalizedTitle)} onChange={() => toggleSubscription(sub.normalizedTitle)} />
                    {sub.representativeTitle}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">฿{Math.round(sub.averageAmount).toLocaleString()}/mo</span>
                </label>
              ))}
              {selectedSubscriptionTitles.length === 0 && <p className="text-xs text-zinc-400 dark:text-zinc-600">{t("aiAnalytics.forecast.whatIf.selectAtLeastOne")}</p>}
            </div>
          ))}

        {activeType === "reduceCoffeeSpending" && (
          <div>
            <p className="mb-2 text-sm">{t("aiAnalytics.forecast.whatIf.reductionPercent")}</p>
            <div className="flex flex-wrap gap-2">
              {COFFEE_REDUCTION_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setReduceCoffeePercent(step)}
                  aria-pressed={reduceCoffeePercent === step}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    reduceCoffeePercent === step ? "bg-brand-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {step}%
                </button>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
            <WhatIfResultDisplay result={result} />
          </div>
        )}
      </div>
    </div>
  );
}
