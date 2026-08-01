import { lastNMonthRanges } from "@/features/finance/utils/cashFlowMath";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import { parseLocalDate } from "@/utils/localDate";
import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// Same salary-keyword heuristic as timeline.ts's salaryReceivedEvents.
const SALARY_KEYWORDS = ["salary", "payroll", "เงินเดือน"];
const ANALYSIS_WINDOW_MONTHS = 3;
const AFTER_SALARY_WINDOW_DAYS = 3;
const LARGE_SPEND_RATIO = 0.2;

function matchesSalaryKeyword(text: string): boolean {
  return SALARY_KEYWORDS.some((kw) => text.toLowerCase().includes(kw));
}

function evaluate(context: RuleContext): RecommendationDraft[] {
  const months = lastNMonthRanges(ANALYSIS_WINDOW_MONTHS, context.now);
  const range = { start: months[0].range.start, end: months[months.length - 1].range.end };

  const salaryTxns = context.transactions.filter(
    (t) => t.type === "income" && isDateWithinRange(t.date, range) && ((t.category && matchesSalaryKeyword(t.category)) || matchesSalaryKeyword(t.title))
  );

  const recommendations: RecommendationDraft[] = [];

  for (const salary of salaryTxns) {
    const salaryDate = parseLocalDate(salary.date);
    const windowEnd = new Date(salaryDate);
    windowEnd.setDate(windowEnd.getDate() + AFTER_SALARY_WINDOW_DAYS);

    const bigSpend = context.transactions.find(
      (t) => t.type === "expense" && t.amount >= salary.amount * LARGE_SPEND_RATIO && parseLocalDate(t.date) >= salaryDate && parseLocalDate(t.date) <= windowEnd
    );
    if (!bigSpend) continue;

    recommendations.push({
      id: `large-spending-after-salary-${salary.date}`,
      key: "largeSpendingAfterSalary",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "medium",
      params: { amount: Math.round(bigSpend.amount), days: AFTER_SALARY_WINDOW_DAYS },
      ...ruleMessages("largeSpendingAfterSalary", {}, { amount: Math.round(bigSpend.amount), days: AFTER_SALARY_WINDOW_DAYS }),
    });
  }

  return recommendations;
}

const rule: FinancialRule = {
  id: "largeSpendingAfterSalary",
  name: "Large Spending After Salary",
  description: "Fires per salary-keyword income transaction followed within 3 days by an expense at least 20% of that income.",
  category: "behavior",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
