import { toLocalDateString } from "@/utils/localDate";
import { isCompletedToday, computeStreak } from "@/features/habits/utils/streak";
import { isActiveOnDate } from "@/features/schedule/utils/activity";
import { toMinutes } from "@/features/schedule/utils/time";
import { calculatePnl } from "@/features/trading/utils/pnl";
import type { Transaction } from "@/features/finance/types";
import type { Todo } from "@/features/todo/types";
import type { Habit } from "@/features/habits/types";
import type { ScheduleItem } from "@/features/schedule/types";
import type { Trade } from "@/features/trading/types";

export type DailySummaryTone = "positive" | "neutral" | "warning";
export type DailySummaryIcon = "expense" | "income" | "todo" | "habit" | "schedule" | "trade";

export interface DailySummaryHighlight {
  id: string;
  icon: DailySummaryIcon;
  key: string;
  params: Record<string, string | number>;
  tone: DailySummaryTone;
}

export interface DailySummaryResult {
  greetingKey: "goodMorning" | "goodAfternoon" | "goodEvening";
  highlights: DailySummaryHighlight[];
  focus: DailySummaryHighlight | null;
  hasActivityToday: boolean;
}

export interface DailySummaryInput {
  transactions: Transaction[];
  todos: Todo[];
  habits: Habit[];
  scheduleItems: ScheduleItem[];
  trades: Trade[];
  now: Date;
}

// Matches TradingOverviewPanel's local (un-exported) formatPnl — trading P/L
// is shown unitless (no currency symbol) everywhere else in the app too.
function formatSignedPnl(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// Active, enabled schedule items today that haven't started yet — shared by
// the "N more today" highlight and the "next up" focus suggestion so both
// agree on exactly what counts as "still upcoming".
function upcomingToday(items: ScheduleItem[], now: Date): ScheduleItem[] {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return items
    .filter((item) => item.enabled && isActiveOnDate(item, now) && toMinutes(item.startTime) > nowMinutes)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

export function computeDailySummary(input: DailySummaryInput): DailySummaryResult {
  const { transactions, todos, habits, scheduleItems, trades, now } = input;
  const today = toLocalDateString(now);
  const hour = now.getHours();

  const greetingKey = hour < 12 ? "goodMorning" : hour < 18 ? "goodAfternoon" : "goodEvening";

  const highlights: DailySummaryHighlight[] = [];

  const expenseToday = transactions
    .filter((t) => t.type === "expense" && t.date === today)
    .reduce((sum, t) => sum + t.amount, 0);
  if (expenseToday > 0) {
    highlights.push({
      id: "expenseToday",
      icon: "expense",
      key: "dashboard.dailySummary.expenseToday",
      params: { amount: expenseToday.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
      tone: "neutral",
    });
  }

  const incomeToday = transactions
    .filter((t) => t.type === "income" && t.date === today)
    .reduce((sum, t) => sum + t.amount, 0);
  if (incomeToday > 0) {
    highlights.push({
      id: "incomeToday",
      icon: "income",
      key: "dashboard.dailySummary.incomeToday",
      params: { amount: incomeToday.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
      tone: "positive",
    });
  }

  const todosCompletedToday = todos.filter(
    (t) => t.completed && t.completedAt && toLocalDateString(new Date(t.completedAt)) === today
  ).length;
  if (todosCompletedToday > 0) {
    highlights.push({
      id: "todosCompletedToday",
      icon: "todo",
      key: "dashboard.dailySummary.todosCompletedToday",
      params: { count: todosCompletedToday },
      tone: "positive",
    });
  }

  const dailyHabits = habits.filter((h) => h.frequency === "daily");
  if (dailyHabits.length > 0) {
    const doneCount = dailyHabits.filter((h) => isCompletedToday(h.completedDates, now)).length;
    highlights.push({
      id: "habitsCheckedInToday",
      icon: "habit",
      key: "dashboard.dailySummary.habitsCheckedInToday",
      params: { done: doneCount, total: dailyHabits.length },
      tone: "neutral",
    });
  }

  const upcomingScheduleItems = upcomingToday(scheduleItems, now);
  if (upcomingScheduleItems.length > 0) {
    highlights.push({
      id: "scheduleUpcomingToday",
      icon: "schedule",
      key: "dashboard.dailySummary.scheduleUpcomingToday",
      params: { count: upcomingScheduleItems.length },
      tone: "neutral",
    });
  }

  const closedToday = trades.filter((t) => t.status === "closed" && t.exitDate === today);
  if (closedToday.length > 0) {
    const pnlToday = closedToday.reduce((sum, t) => sum + (calculatePnl(t) ?? 0), 0);
    highlights.push({
      id: "tradePnlToday",
      icon: "trade",
      key: "dashboard.dailySummary.tradePnlToday",
      params: { pnl: formatSignedPnl(pnlToday) },
      tone: pnlToday >= 0 ? "positive" : "warning",
    });
  }

  let focus: DailySummaryHighlight | null = null;

  const overdueTodos = todos.filter((t) => !t.completed && t.dueDate !== undefined && t.dueDate < today).length;
  if (overdueTodos > 0) {
    focus = {
      id: "focusOverdueTodos",
      icon: "todo",
      key: "dashboard.dailySummary.focusOverdueTodos",
      params: { count: overdueTodos },
      tone: "warning",
    };
  } else {
    const atRiskHabit = dailyHabits
      .filter((h) => !isCompletedToday(h.completedDates, now))
      .map((h) => ({ habit: h, streak: computeStreak(h.completedDates, h.frequency, now) }))
      .filter((entry) => entry.streak > 0)
      .reduce<{ habit: Habit; streak: number } | null>(
        (best, entry) => (best === null || entry.streak > best.streak ? entry : best),
        null
      );

    if (atRiskHabit !== null) {
      focus = {
        id: "focusHabitStreak",
        icon: "habit",
        key: "dashboard.dailySummary.focusHabitStreak",
        params: { streak: atRiskHabit.streak, name: atRiskHabit.habit.name },
        tone: "warning",
      };
    } else if (upcomingScheduleItems.length > 0) {
      const next = upcomingScheduleItems[0];
      focus = {
        id: "focusNextSchedule",
        icon: "schedule",
        key: "dashboard.dailySummary.focusNextSchedule",
        params: { time: next.startTime, title: next.title },
        tone: "neutral",
      };
    }
  }

  return {
    greetingKey,
    highlights,
    focus,
    hasActivityToday: highlights.length > 0,
  };
}
