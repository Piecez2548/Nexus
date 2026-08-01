// Default weights, grade table, and per-calculator thresholds — every field
// here is what "Configurable Weights / Thresholds / Grade Table" means in
// practice: a caller passes a Partial<ScoringConfig> to
// computeFinancialHealthScore()/computeScoreTrend() and mergeScoringConfig()
// deep-merges it over these defaults, so nothing is ever hardcoded past
// this one file.

import type { ScoreCategory, FinancialHealthGrade, FinancialHealthStatus } from "@/features/finance/aiAnalytics/engine/scoring/types";

export type ScoreWeights = Record<ScoreCategory, number>;

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  savingRate: 25,
  budgetDiscipline: 20,
  expenseControl: 15,
  cashFlow: 15,
  incomeStability: 10,
  behavior: 10,
  goalProgress: 5,
};

export interface GradeBand {
  min: number;
  grade: FinancialHealthGrade;
  status: FinancialHealthStatus;
}

// Sorted descending by `min` — gradeForScore() relies on this order to
// return the first (highest) band the score clears.
export const DEFAULT_GRADE_TABLE: GradeBand[] = [
  { min: 95, grade: "A+", status: "excellent" },
  { min: 90, grade: "A", status: "outstanding" },
  { min: 80, grade: "B+", status: "veryGood" },
  { min: 70, grade: "B", status: "good" },
  { min: 60, grade: "C", status: "fair" },
  { min: 50, grade: "D", status: "poor" },
  { min: 0, grade: "F", status: "critical" },
];

export function gradeForScore(score: number, gradeTable: GradeBand[] = DEFAULT_GRADE_TABLE): GradeBand {
  return gradeTable.find((b) => score >= b.min) ?? gradeTable[gradeTable.length - 1];
}

export interface ScoreThresholds {
  savingRate: {
    // Sorted descending by minPercent — spec's literal stepped bands.
    bands: { minPercent: number; score: number }[];
    belowScore: number; // score when under every band's minPercent
  };
  budgetDiscipline: {
    nearWeight: number; // weight given to "near" (vs "ok") budgets in the compliance component
    overageSeverityDivisor: number; // normalizes average % overage into a 0-100 penalty
    repeatedOverspendMonths: number; // consecutive over-budget months that counts as "repeated"
  };
  expenseControl: {
    expenseRatioGoodMax: number; // expense/income at or below this scores 100
    expenseRatioBadMax: number; // expense/income at or above this scores 0
    concentrationWarnPercent: number; // top category's share of expense that starts penalizing
    largePurchaseMultiplier: number; // vs the average transaction, before a purchase counts as "large"
  };
  cashFlow: {
    volatilityMaxCoV: number; // coefficient of variation at/above this scores 0 on stability
  };
  incomeStability: {
    windowMonths: number;
    maxCoefficientOfVariation: number;
  };
  behavior: {
    // Share of this window's total expense a discretionary flag's amount
    // can reach before the behavior sub-score for it bottoms out at 0.
    discretionaryShareFullPenaltyPercent: number;
    // Share of income subscriptions can consume before that sub-score
    // bottoms out at 0.
    subscriptionShareFullPenaltyPercent: number;
  };
  goalProgress: {
    nearCompletePercent: number; // progressPercent at/above this counts as a positive factor
  };
}

export const DEFAULT_SCORE_THRESHOLDS: ScoreThresholds = {
  savingRate: {
    bands: [
      { minPercent: 30, score: 100 },
      { minPercent: 20, score: 85 },
      { minPercent: 10, score: 60 },
    ],
    belowScore: 25,
  },
  budgetDiscipline: {
    nearWeight: 0.5,
    overageSeverityDivisor: 50,
    repeatedOverspendMonths: 2,
  },
  expenseControl: {
    expenseRatioGoodMax: 0.5,
    expenseRatioBadMax: 1.0,
    concentrationWarnPercent: 50,
    largePurchaseMultiplier: 3,
  },
  cashFlow: {
    volatilityMaxCoV: 0.5,
  },
  incomeStability: {
    windowMonths: 6,
    maxCoefficientOfVariation: 0.5,
  },
  behavior: {
    discretionaryShareFullPenaltyPercent: 30,
    subscriptionShareFullPenaltyPercent: 20,
  },
  goalProgress: {
    nearCompletePercent: 90,
  },
};

export interface ScoringConfig {
  weights: ScoreWeights;
  gradeTable: GradeBand[];
  thresholds: ScoreThresholds;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: DEFAULT_SCORE_WEIGHTS,
  gradeTable: DEFAULT_GRADE_TABLE,
  thresholds: DEFAULT_SCORE_THRESHOLDS,
};

// Shallow-per-section merge: a caller overriding e.g. just
// `thresholds.savingRate` still gets every other threshold group's
// defaults, but within `savingRate` must supply the whole sub-object (no
// silent partial-object merging that could leave a threshold half-applied).
export function mergeScoringConfig(overrides?: Partial<ScoringConfig>): ScoringConfig {
  if (!overrides) return DEFAULT_SCORING_CONFIG;
  return {
    weights: { ...DEFAULT_SCORE_WEIGHTS, ...overrides.weights },
    gradeTable: overrides.gradeTable ?? DEFAULT_GRADE_TABLE,
    thresholds: {
      ...DEFAULT_SCORE_THRESHOLDS,
      ...overrides.thresholds,
    },
  };
}
