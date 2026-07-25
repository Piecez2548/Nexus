import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import type { Transaction } from "@/features/finance/types";

export interface SpendingInsight {
  id: string;
  message: string;
  severity: "info" | "warning";
}

const INCREASE_THRESHOLD_PERCENT = 15;
const UNUSUAL_SPEND_MULTIPLIER = 1.5;
const MIN_SAMPLE_FOR_AVERAGE = 3;
const UNUSUAL_DAILY_SPEND_MULTIPLIER = 2;
const MIN_DAYS_FOR_DAILY_AVERAGE = 5;

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sumByCategory(transactions: Transaction[]): Map<string, number> {
  const totals = new Map<string, number>();

  for (const t of transactions) {
    if (t.type !== "expense" || !t.category) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }

  return totals;
}

export function useSpendingInsights(): SpendingInsight[] {
  const { transactions: allTransactions } = useTransactionStore();

  return useMemo(() => {
    // Tolerate a malformed/legacy row with no valid date (e.g. from an old
    // import or a partial sync) instead of crashing every consumer of this
    // hook — see monthKey below, which assumes a real date string.
    const transactions = allTransactions.filter((t) => typeof t.date === "string" && t.date.length >= 7);

    const insights: SpendingInsight[] = [];
    const currentMonth = monthKey(new Date().toISOString().slice(0, 10));
    const previousMonth = shiftMonth(currentMonth, -1);

    const thisMonthTxns = transactions.filter((t) => monthKey(t.date) === currentMonth);
    const lastMonthTxns = transactions.filter((t) => monthKey(t.date) === previousMonth);

    // 1. Category spend increased significantly vs. last month.
    const thisMonthByCategory = sumByCategory(thisMonthTxns);
    const lastMonthByCategory = sumByCategory(lastMonthTxns);

    for (const [category, current] of thisMonthByCategory) {
      const previous = lastMonthByCategory.get(category);
      if (!previous || previous <= 0) continue;

      const percentChange = ((current - previous) / previous) * 100;
      if (percentChange >= INCREASE_THRESHOLD_PERCENT) {
        insights.push({
          id: `category-increase-${category}`,
          message: `ค่า${category}เพิ่มขึ้น ${Math.round(percentChange)}%`,
          severity: "warning",
        });
      }
    }

    // 2. Possible duplicate subscriptions: 2+ distinct recurring titles
    //    in the same category this month.
    const recurringByCategory = new Map<string, Set<string>>();
    for (const t of thisMonthTxns) {
      if (!t.recurring || t.type !== "expense" || !t.category) continue;
      const titles = recurringByCategory.get(t.category) ?? new Set<string>();
      titles.add(t.title.trim().toLowerCase());
      recurringByCategory.set(t.category, titles);
    }

    for (const [category, titles] of recurringByCategory) {
      if (titles.size >= 2) {
        insights.push({
          id: `duplicate-subscription-${category}`,
          message: `ค่า Subscription ซ้ำ ${titles.size} รายการในหมวด${category}`,
          severity: "warning",
        });
      }
    }

    // 3. A single transaction well above its category's historical average.
    const historicalByCategory = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (t.type !== "expense" || !t.category) continue;
      const entries = historicalByCategory.get(t.category) ?? [];
      entries.push(t);
      historicalByCategory.set(t.category, entries);
    }

    for (const t of thisMonthTxns) {
      if (t.type !== "expense" || !t.category) continue;

      const entries = historicalByCategory.get(t.category) ?? [];
      const others = entries.filter((entry) => entry.id !== t.id);
      if (others.length < MIN_SAMPLE_FOR_AVERAGE) continue;

      const average = others.reduce((sum, entry) => sum + entry.amount, 0) / others.length;
      if (average > 0 && t.amount >= average * UNUSUAL_SPEND_MULTIPLIER) {
        insights.push({
          id: `unusual-spend-${t.id}`,
          message: `รายจ่าย "${t.title}" (฿${t.amount.toLocaleString()}) สูงผิดปกติเทียบกับค่าเฉลี่ยหมวด${t.category}`,
          severity: "warning",
        });
      }
    }

    // 4. Today's total spend well above the recent daily average — catches
    //    an overall unusually expensive day even when no single category or
    //    transaction has enough history to flag on its own.
    const today = new Date().toISOString().slice(0, 10);
    const dailyTotals = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const day = t.date.slice(0, 10);
      dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + t.amount);
    }

    const todayTotal = dailyTotals.get(today) ?? 0;
    const otherDays = [...dailyTotals.entries()].filter(([day]) => day !== today);

    if (todayTotal > 0 && otherDays.length >= MIN_DAYS_FOR_DAILY_AVERAGE) {
      const averageDaily = otherDays.reduce((sum, [, amount]) => sum + amount, 0) / otherDays.length;

      if (averageDaily > 0 && todayTotal >= averageDaily * UNUSUAL_DAILY_SPEND_MULTIPLIER) {
        insights.push({
          id: `unusual-daily-spend-${today}`,
          message: `วันนี้ใช้เงินไปแล้ว ฿${todayTotal.toLocaleString()} สูงกว่าค่าเฉลี่ยต่อวัน (฿${Math.round(averageDaily).toLocaleString()}) มาก`,
          severity: "warning",
        });
      }
    }

    return insights;
  }, [allTransactions]);
}
