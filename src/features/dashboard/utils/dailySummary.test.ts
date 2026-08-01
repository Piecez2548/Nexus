import { describe, expect, it } from "vitest";
import { computeDailySummary, type DailySummaryInput } from "./dailySummary";
import type { Transaction } from "@/features/finance/types";
import type { Todo } from "@/features/todo/types";
import type { Habit } from "@/features/habits/types";
import type { ScheduleItem } from "@/features/schedule/types";
import type { Trade } from "@/features/trading/types";

const NOW = new Date(2026, 6, 30, 14, 30); // Thu Jul 30 2026, 14:30 local — "today" = 2026-07-30
const TODAY = "2026-07-30";
const YESTERDAY = "2026-07-29";

function baseInput(overrides: Partial<DailySummaryInput> = {}): DailySummaryInput {
  return {
    transactions: [],
    todos: [],
    habits: [],
    scheduleItems: [],
    trades: [],
    now: NOW,
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    title: "Coffee",
    amount: 100,
    type: "expense",
    account: "Cash",
    date: TODAY,
    ...overrides,
  };
}

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    title: "Task",
    priority: "medium",
    completed: false,
    createdAt: new Date(2026, 6, 1).toISOString(),
    ...overrides,
  };
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    name: "Exercise",
    frequency: "daily",
    completedDates: [],
    createdAt: new Date(2026, 6, 1).toISOString(),
    ...overrides,
  };
}

function makeScheduleItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    title: "Gym",
    icon: "dumbbell",
    color: "#ef4444",
    startTime: "18:00",
    repeat: { frequency: "daily" },
    enabled: true,
    createdAt: new Date(2026, 6, 1).toISOString(),
    ...overrides,
  };
}

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    symbol: "AAPL",
    market: "stocks",
    direction: "long",
    status: "closed",
    entryPrice: 100,
    quantity: 10,
    entryDate: TODAY,
    ...overrides,
  };
}

describe("computeDailySummary", () => {
  it("returns no activity, no highlights, no focus for a fully empty input", () => {
    const result = computeDailySummary(baseInput());
    expect(result.hasActivityToday).toBe(false);
    expect(result.highlights).toEqual([]);
    expect(result.focus).toBeNull();
  });

  describe("greeting", () => {
    it("shows goodMorning before noon", () => {
      expect(computeDailySummary(baseInput({ now: new Date(2026, 6, 30, 11, 59) })).greetingKey).toBe("goodMorning");
    });

    it("shows goodAfternoon at noon and up to 17:59", () => {
      expect(computeDailySummary(baseInput({ now: new Date(2026, 6, 30, 12, 0) })).greetingKey).toBe("goodAfternoon");
      expect(computeDailySummary(baseInput({ now: new Date(2026, 6, 30, 17, 59) })).greetingKey).toBe("goodAfternoon");
    });

    it("shows goodEvening from 18:00 onward", () => {
      expect(computeDailySummary(baseInput({ now: new Date(2026, 6, 30, 18, 0) })).greetingKey).toBe("goodEvening");
    });
  });

  describe("expense/income highlights", () => {
    it("includes today's total expense when > 0", () => {
      const result = computeDailySummary(
        baseInput({ transactions: [makeTransaction({ type: "expense", amount: 150, date: TODAY })] })
      );
      const highlight = result.highlights.find((h) => h.id === "expenseToday");
      expect(highlight).toMatchObject({ key: "dashboard.dailySummary.expenseToday", tone: "neutral" });
      expect(highlight?.params.amount).toBe("150");
    });

    it("excludes the expense highlight when today's expenses are zero", () => {
      const result = computeDailySummary(
        baseInput({ transactions: [makeTransaction({ type: "expense", amount: 150, date: YESTERDAY })] })
      );
      expect(result.highlights.find((h) => h.id === "expenseToday")).toBeUndefined();
    });

    it("includes today's total income when > 0, toned positive", () => {
      const result = computeDailySummary(
        baseInput({ transactions: [makeTransaction({ type: "income", amount: 500, date: TODAY })] })
      );
      const highlight = result.highlights.find((h) => h.id === "incomeToday");
      expect(highlight).toMatchObject({ key: "dashboard.dailySummary.incomeToday", tone: "positive" });
      expect(highlight?.params.amount).toBe("500");
    });
  });

  describe("todos completed today", () => {
    it("counts todos completed today", () => {
      const result = computeDailySummary(
        baseInput({
          todos: [
            makeTodo({ completed: true, completedAt: new Date(2026, 6, 30, 9, 0).toISOString() }),
            makeTodo({ completed: true, completedAt: new Date(2026, 6, 30, 10, 0).toISOString() }),
            makeTodo({ completed: true, completedAt: new Date(2026, 6, 29, 9, 0).toISOString() }), // yesterday
          ],
        })
      );
      const highlight = result.highlights.find((h) => h.id === "todosCompletedToday");
      expect(highlight?.params.count).toBe(2);
    });

    it("excludes the highlight when nothing was completed today", () => {
      const result = computeDailySummary(baseInput({ todos: [makeTodo({ completed: false })] }));
      expect(result.highlights.find((h) => h.id === "todosCompletedToday")).toBeUndefined();
    });
  });

  describe("daily habits checked in today", () => {
    it("includes the ratio even when zero habits are checked in yet", () => {
      const result = computeDailySummary(baseInput({ habits: [makeHabit({ completedDates: [] })] }));
      const highlight = result.highlights.find((h) => h.id === "habitsCheckedInToday");
      expect(highlight?.params).toEqual({ done: 0, total: 1 });
    });

    it("counts only daily-frequency habits, excluding weekly ones", () => {
      const result = computeDailySummary(
        baseInput({
          habits: [
            makeHabit({ frequency: "daily", completedDates: [TODAY] }),
            makeHabit({ frequency: "weekly", completedDates: [] }),
          ],
        })
      );
      const highlight = result.highlights.find((h) => h.id === "habitsCheckedInToday");
      expect(highlight?.params).toEqual({ done: 1, total: 1 });
    });

    it("omits the highlight entirely when there are no daily habits", () => {
      const result = computeDailySummary(baseInput({ habits: [makeHabit({ frequency: "weekly" })] }));
      expect(result.highlights.find((h) => h.id === "habitsCheckedInToday")).toBeUndefined();
    });
  });

  describe("schedule items remaining today", () => {
    it("counts enabled items active today that haven't started yet", () => {
      const result = computeDailySummary(
        baseInput({
          scheduleItems: [
            makeScheduleItem({ startTime: "18:00" }), // after 14:30 -> upcoming
            makeScheduleItem({ startTime: "09:00" }), // before 14:30 -> already happened
          ],
        })
      );
      expect(result.highlights.find((h) => h.id === "scheduleUpcomingToday")?.params.count).toBe(1);
    });

    it("excludes disabled items", () => {
      const result = computeDailySummary(
        baseInput({ scheduleItems: [makeScheduleItem({ startTime: "18:00", enabled: false })] })
      );
      expect(result.highlights.find((h) => h.id === "scheduleUpcomingToday")).toBeUndefined();
    });

    it("excludes items not active today via the repeat rule", () => {
      // NOW is a Thursday (2026-07-30); weekly item only active on Monday (1).
      const result = computeDailySummary(
        baseInput({
          scheduleItems: [makeScheduleItem({ startTime: "18:00", repeat: { frequency: "weekly", weekdays: [1] } })],
        })
      );
      expect(result.highlights.find((h) => h.id === "scheduleUpcomingToday")).toBeUndefined();
    });
  });

  describe("trading P/L today", () => {
    it("sums today's closed-trade P/L and tones it positive when >= 0", () => {
      const result = computeDailySummary(
        baseInput({ trades: [makeTrade({ entryPrice: 100, exitPrice: 120, quantity: 10, exitDate: TODAY })] })
      );
      const highlight = result.highlights.find((h) => h.id === "tradePnlToday");
      expect(highlight).toMatchObject({ tone: "positive" });
      expect(highlight?.params.pnl).toBe("+200");
    });

    it("tones the highlight warning when today's P/L is negative", () => {
      const result = computeDailySummary(
        baseInput({ trades: [makeTrade({ entryPrice: 100, exitPrice: 80, quantity: 10, exitDate: TODAY })] })
      );
      expect(result.highlights.find((h) => h.id === "tradePnlToday")).toMatchObject({ tone: "warning" });
    });

    it("excludes the highlight when no trades closed today", () => {
      const result = computeDailySummary(baseInput({ trades: [makeTrade({ status: "open", exitDate: undefined })] }));
      expect(result.highlights.find((h) => h.id === "tradePnlToday")).toBeUndefined();
    });
  });

  describe("hasActivityToday", () => {
    it("is true whenever at least one highlight is present", () => {
      const result = computeDailySummary(baseInput({ todos: [makeTodo({ completed: true, completedAt: NOW.toISOString() })] }));
      expect(result.hasActivityToday).toBe(true);
    });
  });

  describe("focus priority", () => {
    it("prioritizes overdue todos above everything else", () => {
      const result = computeDailySummary(
        baseInput({
          todos: [makeTodo({ completed: false, dueDate: YESTERDAY })],
          habits: [makeHabit({ completedDates: [YESTERDAY] })], // streak 1, not done today -> would also qualify
          scheduleItems: [makeScheduleItem({ startTime: "18:00" })],
        })
      );
      expect(result.focus).toMatchObject({ key: "dashboard.dailySummary.focusOverdueTodos", tone: "warning" });
      expect(result.focus?.params.count).toBe(1);
    });

    it("falls back to the at-risk habit with the highest streak when no todos are overdue", () => {
      const result = computeDailySummary(
        baseInput({
          habits: [
            makeHabit({ name: "Read", completedDates: [YESTERDAY] }), // streak 1
            makeHabit({ name: "Meditate", completedDates: [YESTERDAY, "2026-07-28"] }), // streak 2
          ],
          scheduleItems: [makeScheduleItem({ startTime: "18:00" })],
        })
      );
      expect(result.focus).toMatchObject({ key: "dashboard.dailySummary.focusHabitStreak" });
      expect(result.focus?.params).toEqual({ streak: 2, name: "Meditate" });
    });

    it("breaks a streak tie by picking the first habit found", () => {
      const result = computeDailySummary(
        baseInput({
          habits: [
            makeHabit({ name: "First", completedDates: [YESTERDAY] }),
            makeHabit({ name: "Second", completedDates: [YESTERDAY] }),
          ],
        })
      );
      expect(result.focus?.params.name).toBe("First");
    });

    it("excludes a habit that has never been checked in (streak 0) from focus", () => {
      const result = computeDailySummary(
        baseInput({
          habits: [makeHabit({ completedDates: [] })],
          scheduleItems: [makeScheduleItem({ startTime: "18:00" })],
        })
      );
      expect(result.focus).toMatchObject({ key: "dashboard.dailySummary.focusNextSchedule" });
    });

    it("excludes a habit already completed today from focus", () => {
      const result = computeDailySummary(
        baseInput({
          habits: [makeHabit({ completedDates: [YESTERDAY, TODAY] })],
          scheduleItems: [makeScheduleItem({ startTime: "18:00" })],
        })
      );
      expect(result.focus).toMatchObject({ key: "dashboard.dailySummary.focusNextSchedule" });
    });

    it("falls back to the next upcoming schedule item when no todos or habits qualify", () => {
      const result = computeDailySummary(
        baseInput({
          scheduleItems: [
            makeScheduleItem({ title: "Dinner", startTime: "19:00" }),
            makeScheduleItem({ title: "Gym", startTime: "18:00" }),
          ],
        })
      );
      expect(result.focus).toMatchObject({ key: "dashboard.dailySummary.focusNextSchedule" });
      expect(result.focus?.params).toEqual({ time: "18:00", title: "Gym" });
    });

    it("excludes a disabled schedule item from focus", () => {
      const result = computeDailySummary(
        baseInput({ scheduleItems: [makeScheduleItem({ startTime: "18:00", enabled: false })] })
      );
      expect(result.focus).toBeNull();
    });

    it("is null when nothing qualifies for any tier", () => {
      const result = computeDailySummary(baseInput());
      expect(result.focus).toBeNull();
    });
  });
});
