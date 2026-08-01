import { parseLocalDate } from "@/utils/localDate";
import { getCurrentPeriodRange } from "@/features/finance/utils/periodRange";
import { lastNMonthRanges, sumByType } from "@/features/finance/utils/cashFlowMath";
import type { BudgetProgress } from "@/features/finance/utils/budgetStatus";
import type { Transaction } from "@/features/finance/types";

const SAVING_RATE_WINDOW_MONTHS = 3;
const SAVING_RATE_TARGET_PERCENT = 20;
const EXPENSE_RATIO_GOOD = 0.5;
const EXPENSE_RATIO_BAD = 1.0;
const INCOME_STABILITY_WINDOW_MONTHS = 6;
const INCOME_STABILITY_MAX_COV = 0.5;
const MIN_MONTHS_FOR_HEADLINE_SCORE = 2;

export type HealthScoreKey = "savingRate" | "expenseRatio" | "budgetControl" | "budgetUsage" | "incomeStability" | "cashFlow";
export type HealthScoreGrade = "excellent" | "good" | "fair" | "poor";

const GRADE_EXCELLENT_MIN = 85;
const GRADE_GOOD_MIN = 70;
const GRADE_FAIR_MIN = 50;

export function gradeForScore(score: number): HealthScoreGrade {
  if (score >= GRADE_EXCELLENT_MIN) return "excellent";
  if (score >= GRADE_GOOD_MIN) return "good";
  if (score >= GRADE_FAIR_MIN) return "fair";
  return "poor";
}

export interface HealthScoreSubScore {
  key: HealthScoreKey;
  // 0-100, or null when this sub-score can't be computed (e.g. no budgets
  // exist yet) — excluded from the overall average rather than counted as 0.
  score: number | null;
  // The underlying raw metric behind `score` (a percentage or ratio), for
  // display alongside the score itself. Null exactly when score is null.
  value: number | null;
}

export interface HealthScoreResult {
  score: number | null;
  grade: HealthScoreGrade | null;
  insufficientData: boolean;
  subScores: HealthScoreSubScore[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Distinct calendar months spanned between the earliest transaction and
// `now`, inclusive, capped at `cap`. Without the cap, a one-month-old
// profile fed into a 6-month window would have 5 fabricated ฿0 months
// baked into Income Stability instead of a short, honest window.
export function computeMonthsOfHistory(transactions: Transaction[], now = new Date(), cap = INCOME_STABILITY_WINDOW_MONTHS): number {
  const validDates = transactions
    .filter((t) => typeof t.date === "string" && t.date.length >= 7)
    .map((t) => parseLocalDate(t.date));
  if (validDates.length === 0) return 0;

  const earliest = validDates.reduce((min, d) => (d < min ? d : min), validDates[0]);
  const span = (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1;
  return Math.min(Math.max(span, 1), cap);
}

function scoreSavingRate(transactions: Transaction[], monthsOfHistory: number, now: Date): HealthScoreSubScore {
  // Guarded at 1, not monthsOfHistory directly — with zero transactions
  // (monthsOfHistory 0), lastNMonthRanges(0, ...) would return an empty
  // array. The window still resolves to a real (empty) month either way.
  const windowMonths = Math.max(Math.min(SAVING_RATE_WINDOW_MONTHS, monthsOfHistory), 1);
  const months = lastNMonthRanges(windowMonths, now);
  const start = months[0].range.start;
  const end = months[months.length - 1].range.end;
  const range = { start, end };

  const income = sumByType(transactions, "income", range);
  const expense = sumByType(transactions, "expense", range);
  if (income <= 0) return { key: "savingRate", score: null, value: null };

  const savingRatePercent = ((income - expense) / income) * 100;
  const score = clamp((savingRatePercent / SAVING_RATE_TARGET_PERCENT) * 100, 0, 100);
  return { key: "savingRate", score, value: savingRatePercent };
}

function scoreExpenseRatio(transactions: Transaction[], now: Date): HealthScoreSubScore {
  const range = getCurrentPeriodRange("monthly", now);
  const income = sumByType(transactions, "income", range);
  const expense = sumByType(transactions, "expense", range);

  if (income <= 0) {
    if (expense <= 0) return { key: "expenseRatio", score: null, value: null };
    // Spending with zero income this month is unambiguously bad, not
    // "no data" — reported as an explicit 0 rather than excluded.
    return { key: "expenseRatio", score: 0, value: null };
  }

  const ratio = expense / income;
  const score = clamp(((EXPENSE_RATIO_BAD - ratio) / (EXPENSE_RATIO_BAD - EXPENSE_RATIO_GOOD)) * 100, 0, 100);
  return { key: "expenseRatio", score, value: ratio };
}

function scoreBudgetControl(budgetProgress: BudgetProgress[]): HealthScoreSubScore {
  if (budgetProgress.length === 0) return { key: "budgetControl", score: null, value: null };

  const okCount = budgetProgress.filter((b) => b.status === "ok").length;
  const nearCount = budgetProgress.filter((b) => b.status === "near").length;
  const score = ((okCount + 0.5 * nearCount) / budgetProgress.length) * 100;
  return { key: "budgetControl", score, value: score };
}

// Raw, unclamped spent/amount per budget — deliberately NOT
// BudgetProgress.percentage, which is clamped to 100 for progress-bar
// display. Reusing the clamped field here would make a budget at 105%
// spend and one at 400% spend both read as a "perfect" 100, exactly
// backwards for a household with blown budgets. The triangular curve
// peaks at exactly 100% utilization and falls off on both sides of it.
function scoreBudgetUsage(budgetProgress: BudgetProgress[]): HealthScoreSubScore {
  const usable = budgetProgress.filter((b) => b.budget.amount > 0);
  if (usable.length === 0) return { key: "budgetUsage", score: null, value: null };

  const utilizations = usable.map((b) => (b.spent / b.budget.amount) * 100);
  const perBudgetScores = utilizations.map((u) => clamp(100 - Math.abs(100 - u), 0, 100));
  const score = perBudgetScores.reduce((sum, s) => sum + s, 0) / perBudgetScores.length;
  const averageUtilization = utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length;
  return { key: "budgetUsage", score, value: averageUtilization };
}

function scoreIncomeStability(transactions: Transaction[], monthsOfHistory: number, now: Date): HealthScoreSubScore {
  if (monthsOfHistory < MIN_MONTHS_FOR_HEADLINE_SCORE) return { key: "incomeStability", score: null, value: null };

  const windowMonths = Math.min(INCOME_STABILITY_WINDOW_MONTHS, monthsOfHistory);
  const months = lastNMonthRanges(windowMonths, now);
  const monthlyIncomes = months.map((m) => sumByType(transactions, "income", m.range));

  const mean = monthlyIncomes.reduce((sum, v) => sum + v, 0) / monthlyIncomes.length;
  if (mean <= 0) return { key: "incomeStability", score: 0, value: null };

  const variance = monthlyIncomes.reduce((sum, v) => sum + (v - mean) ** 2, 0) / monthlyIncomes.length;
  const coefficientOfVariation = Math.sqrt(variance) / mean;
  const score = clamp(100 - (coefficientOfVariation / INCOME_STABILITY_MAX_COV) * 100, 0, 100);
  return { key: "incomeStability", score, value: coefficientOfVariation };
}

// Ratio of months in the window with a non-negative net cash flow
// (income >= expense). A simple, explainable heuristic — deliberately not
// a second coefficient-of-variation metric, which would just duplicate
// Income Stability's job under a different name.
function scoreCashFlow(transactions: Transaction[], monthsOfHistory: number, now: Date): HealthScoreSubScore {
  const windowMonths = Math.min(INCOME_STABILITY_WINDOW_MONTHS, Math.max(monthsOfHistory, 1));
  const months = lastNMonthRanges(windowMonths, now);

  const positiveMonths = months.filter((m) => {
    const income = sumByType(transactions, "income", m.range);
    const expense = sumByType(transactions, "expense", m.range);
    return income - expense >= 0;
  }).length;

  const score = (positiveMonths / months.length) * 100;
  return { key: "cashFlow", score, value: score };
}

export function analyzeHealthScore(transactions: Transaction[], budgetProgress: BudgetProgress[], now = new Date()): HealthScoreResult {
  const monthsOfHistory = computeMonthsOfHistory(transactions, now);

  const subScores: HealthScoreSubScore[] = [
    scoreSavingRate(transactions, monthsOfHistory, now),
    scoreExpenseRatio(transactions, now),
    scoreBudgetControl(budgetProgress),
    scoreBudgetUsage(budgetProgress),
    scoreIncomeStability(transactions, monthsOfHistory, now),
    scoreCashFlow(transactions, monthsOfHistory, now),
  ];

  const insufficientData = monthsOfHistory < MIN_MONTHS_FOR_HEADLINE_SCORE;
  if (insufficientData) return { score: null, grade: null, insufficientData, subScores };

  const included = subScores.filter((s): s is HealthScoreSubScore & { score: number } => s.score !== null);
  const score = included.length === 0 ? null : included.reduce((sum, s) => sum + s.score, 0) / included.length;

  return { score, grade: score === null ? null : gradeForScore(score), insufficientData: false, subScores };
}
