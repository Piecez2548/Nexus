// Goal Progress calculator — Goal Completion (share of goals complete),
// Goal Progress (average progressPercent across every goal), Savings
// Progress (reinterpreted, like goalAnalyzer.ts's own "acceleration"
// reasoning in Prompt 003, via milestonesCrossedThisMonth/
// isDeadlinePassedIncomplete — goals have no contribution-rate history to
// measure a literal savings pace from). null with no goals — no goals yet
// isn't a weakness to penalize, same convention as budgetDiscipline with no
// budgets.

import type { CategoryScoreResult, ScoreContext, ScoreMessage } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { ScoreThresholds } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";

const NS = "aiAnalytics.financialHealthScore.goalProgress";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateGoalProgressScore(context: ScoreContext, weight: number, thresholds: ScoreThresholds["goalProgress"]): CategoryScoreResult {
  const { goalProgress } = context;

  if (goalProgress.length === 0) {
    return {
      category: "goalProgress",
      score: null,
      weight,
      explanation: { reason: { key: `${NS}.reason.noGoals`, params: {} }, positiveFactors: [], negativeFactors: [], improvementSuggestions: [] },
    };
  }

  const completedCount = goalProgress.filter((g) => g.isComplete).length;
  const completionScore = (completedCount / goalProgress.length) * 100;
  const averageProgress = goalProgress.reduce((sum, g) => sum + g.progressPercent, 0) / goalProgress.length;
  const overdueCount = goalProgress.filter((g) => g.isDeadlinePassedIncomplete).length;
  const activityScore = clamp(100 - overdueCount * 25, 0, 100);

  const score = (completionScore + averageProgress + activityScore) / 3;

  const positiveFactors: ScoreMessage[] = [];
  const negativeFactors: ScoreMessage[] = [];
  const improvementSuggestions: ScoreMessage[] = [];

  if (completedCount > 0) {
    positiveFactors.push({ key: `${NS}.positive.goalsCompleted`, params: { count: completedCount } });
  }

  const nearComplete = goalProgress.filter((g) => !g.isComplete && g.progressPercent >= thresholds.nearCompletePercent);
  if (nearComplete.length > 0) {
    positiveFactors.push({ key: `${NS}.positive.nearComplete`, params: { count: nearComplete.length } });
  }

  const activeThisMonth = goalProgress.filter((g) => g.milestonesCrossedThisMonth > 0);
  if (activeThisMonth.length > 0) {
    positiveFactors.push({ key: `${NS}.positive.activeProgress`, params: { count: activeThisMonth.length } });
  }

  if (overdueCount > 0) {
    negativeFactors.push({ key: `${NS}.negative.overdueGoals`, params: { count: overdueCount } });
    improvementSuggestions.push({ key: `${NS}.suggestion.reviewOverdueGoals`, params: { count: overdueCount } });
  }

  if (averageProgress < 25) {
    negativeFactors.push({ key: `${NS}.negative.lowProgress`, params: { percent: Math.round(averageProgress) } });
    improvementSuggestions.push({ key: `${NS}.suggestion.increaseContributions`, params: {} });
  }

  return {
    category: "goalProgress",
    score,
    weight,
    explanation: { reason: { key: `${NS}.reason.hasData`, params: { count: goalProgress.length, completed: completedCount } }, positiveFactors, negativeFactors, improvementSuggestions },
  };
}
