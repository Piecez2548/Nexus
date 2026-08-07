# AI Analytics

**Last Updated:** 2026-08-07

## Overview

"AI Analytics" (`src/features/finance/aiAnalytics/`, ~250 files, mounted at `/ai-analytics`) is a **pure local, rule-based statistical engine — no LLM, no network calls, everything runs synchronously in the browser against the user's own transaction data.** It is the largest and most complex module in the codebase. A separate, fully-built-but-unused "AI Gateway" (`src/ai/`) exists as a designed seam for a future real LLM integration; it is explicitly documented as parked and is confirmed (via repo-wide grep) to have zero importers anywhere in `src/features/`.

Every sub-engine's own header comments trace back to a numbered internal spec ("Prompt 004" through "Prompt 010") — this doc follows that same layering, from the base statistical facts up to the executive summary that sits on top of everything else.

## Data Flow — the orchestration root

`src/features/finance/aiAnalytics/engine/localStatisticalEngine.ts`'s `runAnalysis(input): FinancialAnalysisResult` is the single pipeline every other engine hangs off, run in three strict tiers:

```
Tier 1 — Legacy analyzers (engine/analyzers/*, run first, in this order):
  healthScore → budgetAnalysis → cashFlowAnalysis → spendingAnalysis → behaviorAnalysis
  → forecast → transactionStatistics → goalAnalyzer → insights → recommendations
  (→ internally runs the Rule Engine) → timeline
  + financial-snapshot / merchant-analysis model builders

Tier 2 — Synthesis engines (each fed a context built from Tier 1 results, in this
strict dependency order):
  scoring.computeFinancialHealthScore
  → recommendation.generateActionableRecommendations
  → behavior.analyzeBehaviorProfile
  → forecast.computeForecastProfile
  → executiveSummary.computeExecutiveSummaryReport

Tier 3 — merge everything into one flat FinancialAnalysisResult, returned to the page.
```

`localStatisticalEngine.analyze = (input) => Promise.resolve(runAnalysis(input))` is the default `FinancialIntelligenceEngine` implementation `useFinancialAnalysis.ts` uses — wrapped in a `Promise` purely as a future-swap seam, even though it's synchronous today.

## Intelligence Engine — `hooks/useFinancialAnalysis.ts`

`useFinancialAnalysis(engine = localStatisticalEngine, now?)`: reads 6 finance stores (transactions, budgets, categories, goals, recipientProfiles, goalMilestoneEvents) — does not load them itself, the page owns load orchestration; runs `engine.analyze(input)` inside a `useEffect`, guarding against stale-response races with an incrementing request-id ref; returns `{data, loading, error, retry}`. `retry()` is a stable callback that re-fires `analyze()` against the current store data — used by `ErrorState` to recover from an analysis error in place, without a full-page reload or touching any state outside this hook (UX-001). The `engine` parameter is the documented future-swap seam — a real backend/AI engine would just need to implement `FinancialIntelligenceEngine` and be passed in, with zero page changes.

## Rule Engine (`engine/rules/`)

Evaluates the financial snapshot against **~46 individually-authored threshold rules** across 15 categories (behavior 5, budget 4, cashFlow 3, expense 1, financialHealth 3, food 5, forecast 3, goal 4, merchant 2, positive 6, restaurant 2, savings 1, shopping 3, subscription 2, transport 2), each producing zero-or-more `Recommendation` drafts.

```ts
interface FinancialRule {
  id: string; name: string; description: string;
  category: RuleCategory;               // 11-value union
  defaultPriority: RecommendationPriority; // critical|high|medium|low|information
  enabled: boolean;
  evaluate(context: RuleContext): RecommendationDraft[];
}
```

One file = one rule (default-exported object); `evaluate()` only reads already-computed analyzer results off `RuleContext`, never recomputes raw stats. `registry.ts`'s `runRules(context)` filters enabled rules, flat-maps their evaluation, attaches an estimated impact, and sorts by priority then savings. `shared.ts` provides `priorityForSavings()`, `confidenceForSampleSize()`, and `ruleMessages()` reused by every rule file. Adding a new rule never requires touching an existing one — purely additive registration.

## Health Score (`engine/scoring/`)

An independent, weighted, explainable 0-100 **Financial Health Score**, alongside (not replacing) an older unweighted score (see "Legacy vs Current" below).

**7 sub-scores**, each `{category, score: number|null, weight, explanation}`: `savingRate` (25), `budgetDiscipline` (20), `expenseControl` (15), `cashFlow` (15), `incomeStability` (10), `behavior` (10), `goalProgress` (5) — weights sum to 100.

**Combination:** categories with `score === null` (insufficient data — e.g. no goals/budgets set yet) are excluded and the remaining weights **renormalized**, never treated as a 0: `overallScore = Σ(weight·score) / Σweight` over only the scored categories. Grade comes from a 7-band table (A+ ≥95 … F <50), each carrying a `status` (excellent → critical). `explanations/aggregateExplanations.ts` rolls every category's factors into 5 output buckets: `strengths, weaknesses, warnings, recommendations, improvementOpportunities`.

`score-engine/scoreTrend.ts` additionally re-runs the pipeline once per historical point to produce a trend line, powering `useFinancialHealthTrend.ts`. Each point uses the lean `computeHealthScoreSummary` (overallScore + grade only), skipping the explanation aggregation the trend would otherwise compute and discard (PERF-002); the shared `multiMonthTrends.monthlyValuesFor` helper it leans on is a single pass over transactions rather than one scan per month (PERF-001). Both are output-preserving; the remaining duplicate — the trend's "current" point overlapping the main pipeline's score — is scoped as PERF-003 (see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).

## Behavior Engine (`engine/behavior/`)

A synthesis layer over the *existing* `behaviorAnalysis.ts` flags — not a new detector from scratch. Three composed layers:

1. **9 single-habit detectors** (restaurant, coffee, convenienceStore, weekend, lateNight, impulse, shopping, subscription, salaryDay) + a multi-result recurring-expense detector — each returns `DetectedHabit|null` with `{polarity, confidence, message, supportingMetrics}`.
2. **8 domain analyzers** (food, coffee, shopping, transport, time-of-day, merchantBehavior, recurringPattern, seasonalPattern).
3. **Calculators**: a 9-archetype spending-style classifier (budgetConscious, impulseSpender, restaurantLover, coffeeEnthusiast, shoppingEnthusiast, disciplinedSaver, balancedSpender, growingSaver, highRiskSpender) and a 0-100 behavior-scores calculator (overall/restaurant/shopping/coffee/budgetDiscipline/impulseControl/consistency).

`insights/behaviorInsightGenerator.ts` turns trend deltas (≥15% MoM), weekend-vs-weekday margins (≥20%), and frequent-late-night flags (≥5 txns) into messages — pure threshold checks over already-computed data, no new stats invented.

## Forecast Engine (`engine/forecast/`)

Projects near-future income/expense/savings via **linear day-elapsed extrapolation** (explicitly documented as "not a predictive model"): `projectForRestOfPeriod(soFar, daysElapsed, totalDays) = (soFar/daysElapsed) × totalDays`, shared across monthly/weekly/yearly predictors, plus a coefficient-of-variation-based stability score and a history-driven confidence figure. Extends the same math to budget, savings, and goal forecasts (including `projectedDelayDays` for goals). Classifies category/merchant/behavior trends as increasing/decreasing/stable.

**Alerts** (`alerts/forecastAlertEngine.ts`) reuse the Rule Engine's own output rather than a parallel framework — a fixed rule-key→alert-type map converts matching recommendations into `ForecastAlert`s, plus one genuinely new type (`goalDelay`) derived directly from the goal forecast.

**Interactive What-If simulator** (`scenarios/whatIfScenarios.ts`, driven by `hooks/useWhatIfScenario.ts`) — a user picks one of 4 scenarios (reduce food spending, increase goal savings, cancel subscriptions, reduce coffee spending) and gets a projected outcome. The first three are pure arithmetic; **reducing coffee spending genuinely re-runs the real analyzer chain twice** (once on real transactions, once on a coffee-reduced copy) to report a baseline vs. projected Financial Health Score — never a fabricated "score per baht" shortcut. This tool is on-demand, not part of the batch `FinancialAnalysisResult`.

## Executive Summary (`engine/executiveSummary/`)

The top of the pyramid — aggregates every other synthesis engine's already-computed output, adding zero new statistics. Built in 8 ordered sections: `headlineBuilder` (a 6-branch decision tree reading only already-computed upstream judgments), `overallAssessmentBuilder`, `financialHighlightsBuilder` (up to 5 highlight types, each omitted rather than fabricated when unsupported), `behaviorSummaryBuilder`, `forecastSummarySectionBuilder`, `riskSummaryBuilder`, `topRecommendationsSelector` (top 5, order already prioritized upstream), `actionPlanAggregator` (dedupes suggested actions across the top recommendations into immediate/weekly/monthly/longTerm buckets). Confirmed strictly downstream of scoring, recommendation, behavior, and forecast by its own imports — computed last in the pipeline.

## Recommendation Engine (`engine/recommendation/`)

Enriches each raw Rule Engine finding into a fully-packaged `ActionableRecommendation` — "an enrichment + prioritization layer... not a replacement for the Rule Engine." Adds: `RecommendationCategory` (14-value union), `Difficulty` (easy/moderate/hard, via a fixed category lookup table), `ExpectedCompletionTime` (derived directly from difficulty — a deliberate simplification, not a second independent estimate), a blended confidence score, `estimateAnnualSavings = monthlySavings × 12`, an `ImpactEstimate` (a cheap, honest proxy — not a full re-run of the scoring engine), and 4-horizon `SuggestedActions`. Title/reason/description text is **reused from the underlying rule unchanged** — no new i18n content invented per recommendation. Merchant-tied rules get `supportingMetrics` enriched with real merchant-analysis figures the rule itself doesn't carry. Final sort: priority tier → savings → confidence → difficulty (easy wins ties).

## AI Coach (`engine/coach/`)

An on-demand Q&A layer, **not** part of the batch pipeline — free-text question → classified intent → routed responder reading the already-computed `FinancialAnalysisResult`. "Adds zero new fields to the result... never fabricates: if the data can't support a claim, the response says so."

**Classification** (`classifier/classifyIntent.ts`) is explicitly **rule-based, not machine learning**: scores each of 16 intents by *sum of matched keyword string length* (not match count) against a bilingual EN+TH keyword table, so a distinctive phrase naturally outweighs a short generic overlap. Confidence starts at 50, adds up to +40 for a clear scoring gap, subtracts 20 on a tie-break, capped at 95; a 0-score result classifies as `"unknown"`.

**16 responders**, one per intent (financialOverview, expenseAnalysis, incomeAnalysis, budgetStatus, savingsProgress, cashFlow, financialHealthScore, categorySpending, merchantSpending, restaurantAnalysis, coffeeAnalysis, shoppingAnalysis, forecast, goalProgress, recommendations, behaviorAnalysis) — each reads only its own relevant slice of the result and returns `{answer, reason, supportingMetrics, confidence, relatedRecommendations}` (≤3 related recs). The orchestrator centrally attaches `intent` and a `nextSuggestedQuestion` so no individual responder can typo-drift its own intent label.

## AI Gateway (`src/ai/`) — designed, not wired in

Confirmed via both header comments and grep: `src/ai/index.ts` and `src/ai/services/aiGatewayService.ts` explicitly state the Gateway is "intentionally parked, not wired into the running app," and zero files under `src/features/` import anything from `@/ai`. It provides a complete provider-registry pattern (`AIGateway`, `ProviderRegistry`, `ProviderFactory`, a `LocalRuleProvider` implementation, and the `AIProvider`/`AIRequest`/`AIResponse`/`ProviderConfiguration` DTOs — see [API_INTERFACES.md](API_INTERFACES.md)) — fully built and tested, reserved as the seam a future real-LLM integration would plug into. Every `*Engine` interface in AI Analytics (`FinancialIntelligenceEngine`, `BehaviorEngine`, `ForecastEngine`, etc.) mirrors this same "Promise-returning method, synchronous implementation today" pattern deliberately.

## Legacy analyzers vs. current synthesis engines — is `engine/analyzers/` still load-bearing?

**Yes, decisively — this is a layered relationship, not old-vs-new.** `engine/analyzers/` (13 files: healthScore, spendingAnalysis, budgetAnalysis, cashFlowAnalysis, behaviorAnalysis, recommendations, insights, timeline, multiMonthTrends, categoryDetail, transactionStatistics, forecast, goalAnalyzer) computes the base statistical facts every newer engine (`scoring/`, `behavior/`, `forecast/`, `recommendation/`, `executiveSummary/`) consumes as input — confirmed by every synthesis engine's own header comment describing itself as "alongside," "a synthesis layer over," or "an enrichment layer over" the corresponding legacy analyzer, never a replacement.

Most legacy outputs are still directly rendered in the UI: `spendingAnalysis`, `behaviorAnalysis`, `budgetAnalysis`, `cashFlowAnalysis`, `transactionStatistics`, `insights`, `timeline`, `goalProgress` all back their own current section components. Exactly two lost their *own dedicated UI card* but remain fully computed and consumed internally: the old unweighted `healthScore` (superseded on-screen by the new weighted Financial Health Score card, but still read by 4 rules: `expenseRatioHigh`, `savingRateCritical`, `increaseSavingRate`, `excellentBudgetDiscipline`) and the old `forecast`/`recommendations` outputs (not rendered directly, but still essential inputs to the forecast rules, the Rule Engine's own downstream consumers, and the Recommendation/Behavior/Forecast engines respectively).

## Page Composition — `pages/AiAnalytics.tsx`

Loads the 6 finance stores on mount, runs `useFinancialAnalysis()` + `useFinancialHealthTrend()`, then renders in this order:

1. `AiCoachSection` — free-text Q&A (Coach engine, on-demand per question)
2. `FinancialHealthScoreSection` — weighted score + trend
3. `ExecutiveSummarySection` — headline, highlights, risk, top recommendations, action plan
4. `AiInsightsPanel` — legacy `insights`
5. `SpendingAnalysisSection` — legacy `spendingAnalysis` + `transactionStatistics` (opens the Category Insights drawer)
6. `BehaviorAnalysisSection` — legacy `behaviorAnalysis`
7. `BehaviorProfileSection` — Behavior engine's `behaviorProfile`
8. `MerchantAnalysisSection` — top merchants
9. `BudgetAnalysisSection` — legacy `budgetAnalysis`
10. `CashFlowAnalysisSection` — legacy `cashFlowAnalysis`
11. `ForecastSection` — Forecast engine's `forecastProfile` + the What-If tool
12. `RecommendationsSection` — `actionableRecommendations`
13. `FinancialTimelineSection` — legacy `timeline`

Plus a modal `CategoryInsightsDrawer`, powered by the separate on-demand `useCategoryDetail()` hook (legacy `analyzeCategoryDetail`, not part of the batch result).

**States & accessibility:** the page handles error (`ErrorState`, whose retry re-fetches the finance stores and re-runs the analysis in place — UX-001/UX-002, no full-page reload; a synchronous engine throw is caught and shown here rather than hanging on loading), loading, and zero-transaction empty states at the page level. Every chart across these sections is wrapped in a shared `ChartFigure` (`role="img"` + a data-driven `aria-label`) so a screen reader announces the chart's headline instead of an unlabeled SVG (A11Y-001); the key charts (score radars, health trend, monthly cash flow) additionally carry a visually-hidden `ChartDataTable` giving screen readers the underlying per-point numbers, and a global `:focus-visible` ring makes keyboard focus visible app-wide (A11Y-002).

## Current Status

Fully implemented across all 7 sub-engines plus the legacy analyzer foundation. This is the single most extensively built module in the codebase. Six output-preserving quality passes landed on 2026-08-07 — A11Y-001/A11Y-002 (chart accessibility, focus rings, screen-reader data tables), PERF-001 and PERF-002 (analyzer/trend performance), and UX-001/UX-002 (in-place retry hardened against synchronous throws) — see [CHANGELOG.md](CHANGELOG.md).

## Future Improvements

Wiring `src/ai/`'s Gateway to a real LLM provider is the one clearly-designed-for extension point — it would sit alongside this deterministic engine (e.g. for open-ended natural-language Q&A beyond the Coach's 16 fixed intents), not replace it. See [DECISIONS.md](DECISIONS.md) for why the engine stays rule-based today. Nearer-term, scoped follow-ups are **PERF-003** (share `now` across the analysis/trend hooks to dedupe the trend's current point), surfacing store-level data-load errors as their own error state (UX-002 hardened the retry and synchronous-throw handling but left this piece), and data tables for the remaining secondary charts (A11Y-002 covered focus rings and the key charts) — see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) and [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md).
