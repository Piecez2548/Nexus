import { lastNMonthRanges } from "@/features/finance/utils/cashFlowMath";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import { parseLocalDate, toLocalDateString } from "@/utils/localDate";
import { BEHAVIOR_KEYWORDS, type KeywordBehaviorFlagKey } from "@/features/finance/aiAnalytics/engine/constants/behaviorKeywords";
import type { Budget, RecipientProfile, Transaction } from "@/features/finance/types";
import type { WeekdayAnalysisEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";

export type BehaviorFlagKey = KeywordBehaviorFlagKey | "weekendSpending" | "nightSpending";

export interface BehaviorFlag {
  key: BehaviorFlagKey;
  transactionCount: number;
  totalAmount: number;
  // "unavailable"/"thin" only ever applies to nightSpending, which depends
  // on the optional Transaction.time field most rows won't have — every
  // other flag is derivable from fields present on every transaction.
  dataQuality: "full" | "thin" | "unavailable";
}

export interface LargePurchaseEntry {
  id: number | undefined;
  title: string;
  amount: number;
  category: string | undefined;
  date: string;
}

export interface MerchantMonthlyTrendPoint {
  monthKey: string;
  amount: number;
}

export interface TopMerchantEntry {
  alias: string;
  category: string;
  transactionCount: number;
  totalAmount: number;
  averagePurchase: number;
  lastUsedDate: string;
  monthlyTrend: MerchantMonthlyTrendPoint[];
}

export interface SubscriptionEntry {
  normalizedTitle: string;
  representativeTitle: string;
  category: string | undefined;
  averageAmount: number;
  occurrenceCount: number;
  lastDate: string;
  averageIntervalDays: number;
  // The two most recent charge amounts — already walked during the
  // chronological interval check below, so exposing them costs nothing
  // extra. Lets a rule detect a price increase without recomputing the
  // occurrence history itself.
  lastAmount: number;
  previousAmount: number;
}

export type ImpulsePurchaseReason = "aboveAverageNoBudget" | "multipleSameDay";

export interface ImpulsePurchaseEntry {
  id: number | undefined;
  title: string;
  amount: number;
  category: string | undefined;
  date: string;
  reason: ImpulsePurchaseReason;
}

export interface MostActiveHourResult {
  hour: number | null;
  dataQuality: BehaviorFlag["dataQuality"];
}

export interface BehaviorAnalysisResult {
  flags: BehaviorFlag[];
  // Individual outlier transactions, not an aggregate flag — the "Largest
  // purchases" section needs each purchase's own title/amount/date, which a
  // single count+total pair can't carry. Kept separate from `flags` for
  // that reason, even though it's conceptually the 6th behavior signal from
  // the original spec (Eating out / Coffee / Convenience store / Weekend /
  // Night / Largest purchases).
  largePurchases: LargePurchaseEntry[];
  topMerchants: TopMerchantEntry[];
  subscriptions: SubscriptionEntry[];
  impulsePurchases: ImpulsePurchaseEntry[];
  mostActiveHour: MostActiveHourResult;
  // Reuses spendingAnalysis.weekdayAnalysis's own current-month-scoped
  // entries directly (not recomputed) — unlike every other signal in this
  // file, which is scoped to the trailing 3-month ANALYSIS_WINDOW_MONTHS.
  mostActiveWeekday: WeekdayAnalysisEntry | null;
}

const ANALYSIS_WINDOW_MONTHS = 3;
const TOP_LARGE_PURCHASES_COUNT = 5;
const TOP_MERCHANTS_COUNT = 5;
const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 5;
const THIN_TIME_COVERAGE_RATIO = 0.3;

const SUBSCRIPTION_WINDOW_MONTHS = 6;
const SUBSCRIPTION_MIN_INTERVAL_DAYS = 25;
const SUBSCRIPTION_MAX_INTERVAL_DAYS = 35;
const SUBSCRIPTION_AMOUNT_TOLERANCE = 0.1;
const SUBSCRIPTION_RECENCY_DAYS = 45;

const IMPULSE_MULTIPLIER = 3;
const IMPULSE_MIN_WINDOW_TRANSACTIONS = 5;

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / msPerDay);
}

function windowRange(now: Date) {
  const months = lastNMonthRanges(ANALYSIS_WINDOW_MONTHS, now);
  return { start: months[0].range.start, end: months[months.length - 1].range.end };
}

// Exported so rule files needing keyword-matched (not category-based)
// transaction sets — e.g. coffee/transport rules that must total spend
// across whatever category a purchase happened to land in — can reuse the
// exact same matching logic instead of re-deriving it.
export function recipientAliasLookup(recipientProfiles: RecipientProfile[]): Map<string, string> {
  return new Map(recipientProfiles.map((p) => [p.recipientKey, p.alias]));
}

function matchesAnyKeyword(text: string, keywords: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

export function matchesKeywordFlag(t: Transaction, keywords: readonly string[], aliasByKey: Map<string, string>): boolean {
  if (t.category && matchesAnyKeyword(t.category, keywords)) return true;
  if (matchesAnyKeyword(t.title, keywords)) return true;
  const alias = t.recipient ? aliasByKey.get(t.recipient) : undefined;
  return alias !== undefined && matchesAnyKeyword(alias, keywords);
}

function keywordFlag(key: KeywordBehaviorFlagKey, transactions: Transaction[], aliasByKey: Map<string, string>): BehaviorFlag {
  const matches = transactions.filter((t) => matchesKeywordFlag(t, BEHAVIOR_KEYWORDS[key], aliasByKey));
  return {
    key,
    transactionCount: matches.length,
    totalAmount: matches.reduce((sum, t) => sum + t.amount, 0),
    dataQuality: "full",
  };
}

function weekendSpendingFlag(transactions: Transaction[]): BehaviorFlag {
  const matches = transactions.filter((t) => {
    const [year, month, day] = t.date.split("-").map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    return weekday === 0 || weekday === 6;
  });
  return {
    key: "weekendSpending",
    transactionCount: matches.length,
    totalAmount: matches.reduce((sum, t) => sum + t.amount, 0),
    dataQuality: "full",
  };
}

function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

function nightSpendingFlag(transactions: Transaction[]): BehaviorFlag {
  const withTime = transactions.filter((t) => typeof t.time === "string" && t.time.length > 0);
  const coverage = transactions.length > 0 ? withTime.length / transactions.length : 0;

  const dataQuality: BehaviorFlag["dataQuality"] = withTime.length === 0 ? "unavailable" : coverage < THIN_TIME_COVERAGE_RATIO ? "thin" : "full";

  const matches = withTime.filter((t) => {
    const hour = Number(t.time!.split(":")[0]);
    return Number.isFinite(hour) && isNightHour(hour);
  });

  return {
    key: "nightSpending",
    transactionCount: matches.length,
    totalAmount: matches.reduce((sum, t) => sum + t.amount, 0),
    dataQuality,
  };
}

function computeLargePurchases(transactions: Transaction[]): LargePurchaseEntry[] {
  return [...transactions]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, TOP_LARGE_PURCHASES_COUNT)
    .map((t) => ({ id: t.id, title: t.title, amount: t.amount, category: t.category, date: t.date }));
}

// 6 months, wider than this file's usual 3-month ANALYSIS_WINDOW_MONTHS —
// a trend needs more history than a single-window snapshot to be
// meaningful. Only computed for the already-sliced top 5 merchants
// (decision: eager but capped, cheap enough to always compute alongside
// the rest of behaviorAnalysis).
const MERCHANT_TREND_WINDOW_MONTHS = 6;

function computeMerchantMonthlyTrend(recipientKey: string, transactions: Transaction[], now: Date): MerchantMonthlyTrendPoint[] {
  return lastNMonthRanges(MERCHANT_TREND_WINDOW_MONTHS, now).map((m) => ({
    monthKey: m.monthKey,
    amount: transactions.filter((t) => t.recipient === recipientKey && isDateWithinRange(t.date, m.range)).reduce((sum, t) => sum + t.amount, 0),
  }));
}

function computeTopMerchants(recipientProfiles: RecipientProfile[], transactions: Transaction[], now: Date): TopMerchantEntry[] {
  return [...recipientProfiles]
    .sort((a, b) => b.transactionCount - a.transactionCount)
    .slice(0, TOP_MERCHANTS_COUNT)
    .map((p) => ({
      alias: p.alias,
      category: p.category,
      transactionCount: p.transactionCount,
      totalAmount: p.totalAmount,
      averagePurchase: p.transactionCount > 0 ? p.totalAmount / p.transactionCount : 0,
      lastUsedDate: p.lastUsedDate,
      monthlyTrend: computeMerchantMonthlyTrend(p.recipientKey, transactions, now),
    }));
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

// A subscription is expense transactions sharing a normalized title +
// category that recur roughly monthly (25-35 day gaps) at a near-identical
// amount (within 10%) — every consecutive gap and amount pair must qualify,
// not just some of them, so an irregular repeat doesn't false-positive.
// Scoped wider than this file's usual 3-month window (recurrence needs more
// history to detect), and excludes anything that's gone quiet for over 45
// days so a cancelled subscription doesn't linger.
function computeSubscriptions(transactions: Transaction[], now: Date): SubscriptionEntry[] {
  const cutoff = new Date(now.getFullYear(), now.getMonth() - SUBSCRIPTION_WINDOW_MONTHS, now.getDate());
  const windowExpenses = transactions.filter((t) => t.type === "expense" && parseLocalDate(t.date) >= cutoff && parseLocalDate(t.date) <= now);

  const groups = new Map<string, Transaction[]>();
  for (const t of windowExpenses) {
    const key = `${normalizeTitle(t.title)}|${t.category ?? ""}`;
    const group = groups.get(key);
    if (group) group.push(t);
    else groups.set(key, [t]);
  }

  const today = toLocalDateString(now);
  const subscriptions: SubscriptionEntry[] = [];

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const intervals: number[] = [];
    let isRegular = true;
    for (let i = 1; i < sorted.length; i++) {
      const gap = daysBetween(sorted[i - 1].date, sorted[i].date);
      const amountDiff = Math.abs(sorted[i].amount - sorted[i - 1].amount) / Math.max(sorted[i - 1].amount, 1);
      if (gap < SUBSCRIPTION_MIN_INTERVAL_DAYS || gap > SUBSCRIPTION_MAX_INTERVAL_DAYS || amountDiff > SUBSCRIPTION_AMOUNT_TOLERANCE) {
        isRegular = false;
        break;
      }
      intervals.push(gap);
    }
    if (!isRegular) continue;

    const last = sorted[sorted.length - 1];
    if (daysBetween(last.date, today) > SUBSCRIPTION_RECENCY_DAYS) continue;

    const previous = sorted[sorted.length - 2];

    subscriptions.push({
      normalizedTitle: normalizeTitle(last.title),
      representativeTitle: last.title,
      category: last.category,
      averageAmount: sorted.reduce((sum, t) => sum + t.amount, 0) / sorted.length,
      occurrenceCount: sorted.length,
      lastDate: last.date,
      averageIntervalDays: intervals.reduce((sum, i) => sum + i, 0) / intervals.length,
      lastAmount: last.amount,
      previousAmount: previous.amount,
    });
  }

  return subscriptions.sort((a, b) => b.averageAmount - a.averageAmount);
}

// Deliberately distinct from largePurchases (a pure size ranking): two
// unioned signals, each carrying its own explainable reason rather than a
// single opaque "impulse" verdict.
function computeImpulsePurchases(windowExpenses: Transaction[], budgets: Budget[], aliasByKey: Map<string, string>): ImpulsePurchaseEntry[] {
  const results: ImpulsePurchaseEntry[] = [];
  const seen = new Set<string>();

  function addOnce(t: Transaction, reason: ImpulsePurchaseReason) {
    const key = String(t.id ?? `${t.date}-${t.amount}-${t.title}`);
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ id: t.id, title: t.title, amount: t.amount, category: t.category, date: t.date, reason });
  }

  // Signal 1: amount far above the person's own average, in a category with
  // no budget to have made the purchase deliberate.
  if (windowExpenses.length >= IMPULSE_MIN_WINDOW_TRANSACTIONS) {
    const average = windowExpenses.reduce((sum, t) => sum + t.amount, 0) / windowExpenses.length;
    const budgetCategories = new Set(budgets.map((b) => b.category));

    for (const t of windowExpenses) {
      if (t.amount > average * IMPULSE_MULTIPLIER && (!t.category || !budgetCategories.has(t.category))) {
        addOnce(t, "aboveAverageNoBudget");
      }
    }
  }

  // Signal 2: 2+ same-day purchases in a discretionary (keyword-flagged)
  // category — reuses the same matching helper as the eatingOut/coffee/
  // convenienceStore flags above, no new matching logic.
  const discretionaryKeys: KeywordBehaviorFlagKey[] = ["eatingOut", "coffee", "convenienceStore"];
  const byDate = new Map<string, Transaction[]>();
  for (const t of windowExpenses) {
    const isDiscretionary = discretionaryKeys.some((key) => matchesKeywordFlag(t, BEHAVIOR_KEYWORDS[key], aliasByKey));
    if (!isDiscretionary) continue;
    const list = byDate.get(t.date);
    if (list) list.push(t);
    else byDate.set(t.date, [t]);
  }

  for (const list of byDate.values()) {
    if (list.length < 2) continue;
    for (const t of list) addOnce(t, "multipleSameDay");
  }

  return results.sort((a, b) => b.amount - a.amount);
}

function computeMostActiveHour(windowExpenses: Transaction[]): MostActiveHourResult {
  const withTime = windowExpenses.filter((t) => typeof t.time === "string" && t.time.length > 0);
  const coverage = windowExpenses.length > 0 ? withTime.length / windowExpenses.length : 0;
  const dataQuality: BehaviorFlag["dataQuality"] = withTime.length === 0 ? "unavailable" : coverage < THIN_TIME_COVERAGE_RATIO ? "thin" : "full";

  const totals = new Array(24).fill(0) as number[];
  for (const t of withTime) {
    const hour = Number(t.time!.split(":")[0]);
    if (Number.isFinite(hour) && hour >= 0 && hour < 24) totals[hour] += t.amount;
  }

  const maxTotal = Math.max(0, ...totals);
  const hour = maxTotal > 0 ? totals.indexOf(maxTotal) : null;
  return { hour, dataQuality };
}

function computeMostActiveWeekday(weekdayAnalysis: WeekdayAnalysisEntry[]): WeekdayAnalysisEntry | null {
  const active = weekdayAnalysis.filter((w) => w.count > 0);
  if (active.length === 0) return null;
  return active.reduce((max, w) => (w.total > max.total ? w : max));
}

export function analyzeBehavior(
  transactions: Transaction[],
  recipientProfiles: RecipientProfile[],
  budgets: Budget[],
  weekdayAnalysis: WeekdayAnalysisEntry[],
  now = new Date()
): BehaviorAnalysisResult {
  const range = windowRange(now);
  const windowExpenses = transactions.filter((t) => t.type === "expense" && isDateWithinRange(t.date, range));
  const aliasByKey = recipientAliasLookup(recipientProfiles);

  const flags: BehaviorFlag[] = [
    keywordFlag("eatingOut", windowExpenses, aliasByKey),
    keywordFlag("coffee", windowExpenses, aliasByKey),
    keywordFlag("convenienceStore", windowExpenses, aliasByKey),
    weekendSpendingFlag(windowExpenses),
    nightSpendingFlag(windowExpenses),
  ];

  return {
    flags,
    largePurchases: computeLargePurchases(windowExpenses),
    topMerchants: computeTopMerchants(recipientProfiles, transactions, now),
    subscriptions: computeSubscriptions(transactions, now),
    impulsePurchases: computeImpulsePurchases(windowExpenses, budgets, aliasByKey),
    mostActiveHour: computeMostActiveHour(windowExpenses),
    mostActiveWeekday: computeMostActiveWeekday(weekdayAnalysis),
  };
}
