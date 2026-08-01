import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

function evaluate(context: RuleContext): RecommendationDraft[] {
  if (context.healthScore.grade !== "excellent") return [];

  return [
    {
      id: "excellent-budget-discipline",
      key: "excellentBudgetDiscipline",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "high",
      params: {},
      ...ruleMessages("excellentBudgetDiscipline", {}, {}),
    },
  ];
}

const rule: FinancialRule = {
  id: "excellentBudgetDiscipline",
  name: "Excellent Budget Discipline",
  description: "Celebrates an overall financial health grade of \"excellent\". Matches the spec's own literal example verbatim.",
  category: "financialHealth",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
