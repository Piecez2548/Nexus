import { getCurrentPeriodRange, isDateWithinRange } from "@/features/finance/utils/periodRange";
import { lastNMonthRanges } from "@/features/finance/utils/cashFlowMath";
import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { BehaviorAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { GoalMilestoneEvent, Transaction } from "@/features/finance/types";

export type TimelineEventType = "salaryReceived" | "budgetExceeded" | "largePurchase" | "monthlySummary" | "savingMilestone" | "highestSpendingDay";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string; // ISO date/timestamp — sortable, most-recent-first
  params: Record<string, string | number>;
}

const SALARY_WINDOW_MONTHS = 3;
const SALARY_KEYWORDS = ["salary", "payroll", "เงินเดือน"];

function matchesSalaryKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return SALARY_KEYWORDS.some((kw) => lower.includes(kw));
}

function salaryReceivedEvents(transactions: Transaction[], now: Date): TimelineEvent[] {
  const months = lastNMonthRanges(SALARY_WINDOW_MONTHS, now);
  const range = { start: months[0].range.start, end: months[months.length - 1].range.end };

  return transactions
    .filter((t) => t.type === "income" && isDateWithinRange(t.date, range))
    .filter((t) => (t.category && matchesSalaryKeyword(t.category)) || matchesSalaryKeyword(t.title))
    .map((t) => ({
      id: `salary-${t.id ?? t.date}`,
      type: "salaryReceived" as const,
      date: t.date,
      params: { title: t.title, amount: t.amount },
    }));
}

// The date a currently-over budget's category crossed its cap this period
// — found by walking that category's in-period expense transactions in
// chronological order and locating where the running total first reaches
// the budget amount. Scoped to the *current* period only (a documented v1
// limitation): a budget that's been over every month for a year only ever
// gets this period's crossing date, not a full history of past overages.
function budgetExceededEvents(transactions: Transaction[], budgetAnalysis: BudgetAnalysisResult, now: Date): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const entry of budgetAnalysis.entries) {
    if (entry.status !== "over") continue;

    const range = getCurrentPeriodRange(entry.budget.period, now);
    const categoryTxns = transactions
      .filter((t) => t.type === "expense" && t.category === entry.budget.category && isDateWithinRange(t.date, range))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    let running = 0;
    let crossingDate: string | null = null;
    for (const t of categoryTxns) {
      running += t.amount;
      if (running >= entry.budget.amount) {
        crossingDate = t.date;
        break;
      }
    }
    if (!crossingDate) continue;

    events.push({
      id: `budget-exceeded-${entry.budget.category}`,
      type: "budgetExceeded",
      date: crossingDate,
      params: { category: entry.budget.category, amount: entry.budget.amount },
    });
  }

  return events;
}

function largePurchaseEvents(behaviorAnalysis: BehaviorAnalysisResult): TimelineEvent[] {
  return behaviorAnalysis.largePurchases.map((p) => ({
    id: `large-purchase-${p.id ?? `${p.date}-${p.amount}`}`,
    type: "largePurchase" as const,
    date: p.date,
    params: { title: p.title, amount: p.amount, category: p.category ?? "" },
  }));
}

function lastDayOfMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year, month, 0);
  const y = lastDay.getFullYear();
  const m = String(lastDay.getMonth() + 1).padStart(2, "0");
  const d = String(lastDay.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Excludes the current, still-in-progress month — its numbers aren't a
// finished "summary" yet, and would misleadingly look like a below-average
// month simply because it isn't over. Also excludes months with literally
// no income and no expense — cashFlowAnalysis's 6-month window always
// returns a full 6 entries regardless of how much real history exists, so
// a new profile would otherwise get a timeline full of "summaries" for
// months before the user ever opened the app.
function monthlySummaryEvents(cashFlowAnalysis: CashFlowAnalysisResult): TimelineEvent[] {
  return cashFlowAnalysis.monthlyTrend
    .slice(0, -1)
    .filter((m) => m.income !== 0 || m.expense !== 0)
    .map((m) => ({
      id: `monthly-summary-${m.monthKey}`,
      type: "monthlySummary" as const,
      date: lastDayOfMonthKey(m.monthKey),
      params: { monthKey: m.monthKey, income: m.income, expense: m.expense, saving: m.saving },
    }));
}

function savingMilestoneEvents(goalMilestoneEvents: GoalMilestoneEvent[]): TimelineEvent[] {
  return goalMilestoneEvents.map((e) => ({
    id: `saving-milestone-${e.id ?? e.syncId}`,
    type: "savingMilestone" as const,
    date: e.reachedAt,
    params: { goalName: e.goalName, tier: e.tier },
  }));
}

// Reuses spendingAnalysis.highestSpendingDay verbatim (same field insights.ts
// reads) rather than recomputing it — both places always agree on which day
// was highest.
function highestSpendingDayEvents(spendingAnalysis: SpendingAnalysisResult): TimelineEvent[] {
  const day = spendingAnalysis.highestSpendingDay;
  if (!day) return [];
  return [{ id: `highest-spending-day-${day.date}`, type: "highestSpendingDay" as const, date: day.date, params: { amount: day.amount } }];
}

export function buildTimeline(
  transactions: Transaction[],
  budgetAnalysis: BudgetAnalysisResult,
  behaviorAnalysis: BehaviorAnalysisResult,
  cashFlowAnalysis: CashFlowAnalysisResult,
  spendingAnalysis: SpendingAnalysisResult,
  goalMilestoneEvents: GoalMilestoneEvent[],
  now = new Date()
): TimelineEvent[] {
  const events = [
    ...salaryReceivedEvents(transactions, now),
    ...budgetExceededEvents(transactions, budgetAnalysis, now),
    ...largePurchaseEvents(behaviorAnalysis),
    ...monthlySummaryEvents(cashFlowAnalysis),
    ...savingMilestoneEvents(goalMilestoneEvents),
    ...highestSpendingDayEvents(spendingAnalysis),
  ];

  return events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
