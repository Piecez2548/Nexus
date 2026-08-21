import type { ExecutiveContext, ExecutivePriorityItem, ExecutivePriorityCategory, ExecutiveTodoItem, ExecutiveHabitItem, ExecutiveGoalSnapshot } from "@/features/executive/types";
import type { Todo } from "@/features/todo/types";
import { toLocalDateString } from "@/utils/localDate";

// Deterministic, explainable, no LLM/randomness -- every score is a sum of
// real signals already present on the item (overdue, deadline proximity,
// declared importance, at-risk streak). Schedule items are deliberately
// NOT scored here: they're time-anchored routine activities, not
// deadline-driven priorities, and mixing "workout at 17:30" into the same
// numeric ranking as "assignment overdue" would compare two different
// kinds of urgency. This mirrors dashboard/utils/dailySummary.ts's own
// existing precedent, where a schedule item is only ever the *fallback*
// focus (after overdue todos and at-risk habits), never itself scored.

const PRIORITY_WEIGHT: Record<Todo["priority"], number> = { high: 30, medium: 15, low: 5 };
const CATEGORY_ORDER: Record<ExecutivePriorityCategory, number> = { todo: 0, goal: 1, habit: 2 };

function daysOverdue(dueDate: string, today: Date): number {
  const todayStr = toLocalDateString(today);
  // Both are "YYYY-MM-DD" strings -- lexicographic diff isn't a day count,
  // so this compares real Date objects at local midnight.
  const [dy, dm, dd] = dueDate.split("-").map(Number);
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const due = new Date(dy, dm - 1, dd);
  const t = new Date(ty, tm - 1, td);
  return Math.round((t.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
}

function scoreOverdueTodo(todo: ExecutiveTodoItem, now: Date): ExecutivePriorityItem {
  const overdueDays = todo.dueDate ? Math.max(0, daysOverdue(todo.dueDate, now)) : 0;
  const score = 100 + PRIORITY_WEIGHT[todo.priority] + Math.min(overdueDays, 10) * 2;

  return {
    id: `todo-${todo.id}`,
    category: "todo",
    title: todo.title,
    score,
    reasons: [
      { key: "executive.reason.overdue", params: { days: overdueDays } },
      { key: "executive.reason.priority", params: { priority: todo.priority } },
    ],
  };
}

function scoreDueTodayTodo(todo: ExecutiveTodoItem): ExecutivePriorityItem {
  return {
    id: `todo-${todo.id}`,
    category: "todo",
    title: todo.title,
    score: 50 + PRIORITY_WEIGHT[todo.priority],
    reasons: [
      { key: "executive.reason.dueToday" },
      { key: "executive.reason.priority", params: { priority: todo.priority } },
    ],
  };
}

function scoreHabit(habit: ExecutiveHabitItem): ExecutivePriorityItem | null {
  if (habit.isCompletedToday) return null;

  const score = habit.streak > 0 ? 40 + Math.min(habit.streak, 10) * 2 : 10;
  const reasons = habit.streak > 0
    ? [{ key: "executive.reason.streakAtRisk", params: { streak: habit.streak } }]
    : [{ key: "executive.reason.notCompletedToday" }];

  return { id: `habit-${habit.id}`, category: "habit", title: habit.name, score, reasons };
}

function scoreGoal(entry: ExecutiveGoalSnapshot): ExecutivePriorityItem | null {
  if (entry.isComplete) return null;

  if (entry.isAtRisk && entry.daysRemaining !== null) {
    const overdueDays = Math.abs(entry.daysRemaining);
    return {
      id: `goal-${entry.goal.id}`,
      category: "goal",
      title: entry.goal.name,
      score: 90 + Math.min(overdueDays, 20),
      reasons: [{ key: "executive.reason.goalPastDeadline", params: { days: overdueDays } }],
    };
  }

  if (entry.daysRemaining !== null && entry.daysRemaining >= 0 && entry.daysRemaining <= 7) {
    return {
      id: `goal-${entry.goal.id}`,
      category: "goal",
      title: entry.goal.name,
      score: 40 + (7 - entry.daysRemaining) * 3,
      reasons: [{ key: "executive.reason.goalDeadlineSoon", params: { days: entry.daysRemaining } }],
    };
  }

  return null;
}

// Stable, explicit tie-break: score desc, then a fixed category order
// (todo, goal, habit), then id asc -- so two items with an identical score
// always sort the same way regardless of input array order.
function comparePriorities(a: ExecutivePriorityItem, b: ExecutivePriorityItem): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.category !== b.category) return CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
  return a.id.localeCompare(b.id);
}

export function calculateExecutivePriorities(context: ExecutiveContext): ExecutivePriorityItem[] {
  const items: ExecutivePriorityItem[] = [];

  for (const todo of context.overdueTodos) items.push(scoreOverdueTodo(todo, context.now));
  for (const todo of context.todayTodos) items.push(scoreDueTodayTodo(todo));

  for (const habit of context.habits) {
    const scored = scoreHabit(habit);
    if (scored) items.push(scored);
  }

  for (const goal of context.goals) {
    const scored = scoreGoal(goal);
    if (scored) items.push(scored);
  }

  return items.sort(comparePriorities);
}
