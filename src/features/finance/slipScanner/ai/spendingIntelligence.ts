// Spending Intelligence (GS-048): generate deterministic insights from
// transactions — top category, frequent merchant, monthly trend, and abnormal
// (outlier) expenses — each with a plain-language explanation. The messages are
// English templates; a UI layer can localise. Advisory only.

export interface SpendTxn {
  amount: number;
  date?: string; // YYYY-MM-DD
  merchant?: string;
  category?: string;
  type?: string;
}

export type InsightKind = "top-category" | "frequent-merchant" | "monthly-trend" | "abnormal-expense";

export interface SpendingInsight {
  kind: InsightKind;
  message: string;
  severity: "info" | "warning";
}

function topByReducer<T>(items: T[], keyOf: (t: T) => string, valueOf: (t: T) => number): { key: string; value: number } | null {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(keyOf(item), (totals.get(keyOf(item)) ?? 0) + valueOf(item));
  let best: { key: string; value: number } | null = null;
  for (const [key, value] of totals) if (!best || value > best.value) best = { key, value };
  return best;
}

export function generateSpendingInsights(txns: SpendTxn[]): SpendingInsight[] {
  const expenses = txns.filter((t) => (t.type ?? "expense") === "expense" && t.amount > 0);
  if (expenses.length === 0) return [];

  const insights: SpendingInsight[] = [];

  // Top category by total spend.
  const topCat = topByReducer(expenses, (t) => t.category ?? "Others", (t) => t.amount);
  if (topCat) {
    insights.push({
      kind: "top-category",
      severity: "info",
      message: `Your biggest spending category is ${topCat.key} (${topCat.value.toLocaleString()}).`,
    });
  }

  // Most frequent merchant by count.
  const freq = topByReducer(expenses.filter((t) => t.merchant), (t) => t.merchant!, () => 1);
  if (freq && freq.value >= 2) {
    insights.push({
      kind: "frequent-merchant",
      severity: "info",
      message: `You spend most often at ${freq.key} (${freq.value} times).`,
    });
  }

  // Monthly trend: last month vs the previous one.
  const byMonth = new Map<string, number>();
  for (const e of expenses) {
    if (!e.date) continue;
    const month = e.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + e.amount);
  }
  const months = [...byMonth.keys()].sort();
  if (months.length >= 2) {
    const last = byMonth.get(months[months.length - 1]!)!;
    const prev = byMonth.get(months[months.length - 2]!)!;
    if (prev > 0) {
      const pct = Math.round(((last - prev) / prev) * 100);
      const direction = pct >= 0 ? "up" : "down";
      insights.push({
        kind: "monthly-trend",
        severity: pct > 20 ? "warning" : "info",
        message: `Spending is ${direction} ${Math.abs(pct)}% vs last month.`,
      });
    }
  }

  // Abnormal expenses: robustly, more than 3× the median spend. Using the
  // median (not mean + Nσ) keeps the threshold stable — a single huge expense
  // doesn't inflate its own cutoff. Requires a small baseline of expenses.
  const amounts = expenses.map((e) => e.amount);
  const sorted = [...amounts].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  if (expenses.length >= 4 && median > 0) {
    const outliers = expenses
      .filter((e) => e.amount > 3 * median)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    for (const o of outliers) {
      insights.push({
        kind: "abnormal-expense",
        severity: "warning",
        message: `Unusually large expense: ${o.amount.toLocaleString()}${o.merchant ? ` at ${o.merchant}` : ""}.`,
      });
    }
  }

  return insights;
}
