import type { ExecutiveContext, ExecutivePriorityItem, ExecutiveSummary, ExecutiveWorkloadLevel } from "@/features/executive/types";

const LIGHT_MAX = 2;
const MODERATE_MAX = 5;

// Deterministic bucket on the same priority-item count the UI already
// renders -- not a fabricated "AI-assessed" workload, just a threshold
// over real counted items.
function workloadLevel(priorityCount: number): ExecutiveWorkloadLevel {
  if (priorityCount <= LIGHT_MAX) return "light";
  if (priorityCount <= MODERATE_MAX) return "moderate";
  return "high";
}

// Deterministic, rule-based -- deliberately called "Executive Summary", not
// "AI says", since no AI/LLM is involved (EXEC-001 scope: Section 7).
export function buildExecutiveSummary(context: ExecutiveContext, priorities: ExecutivePriorityItem[]): ExecutiveSummary {
  const todayPriorityCount = priorities.length;
  const atRiskGoalsCount = context.goals.filter((g) => g.isAtRisk).length;

  return {
    workloadLevel: workloadLevel(todayPriorityCount),
    topPriority: priorities[0] ?? null,
    overdueCount: context.overdueTodos.length,
    atRiskGoalsCount,
    todayPriorityCount,
  };
}
