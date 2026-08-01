// Analytics domain model surface for Timeline — aliases the types
// timeline.ts already owns and computes. See timeline.ts for
// buildTimeline(); nothing here recomputes it.
//
// "Title"/"Description" aren't stored fields: like every other model in
// this engine, a Timeline entry's text is resolved from `params` via
// t(type, params) only at render time, never baked into the engine.
// "Amount"/"Category" live inside `params` when the event type carries
// them (e.g. largePurchase has both; monthlySummary has income/expense/
// saving instead of a single amount) rather than being hoisted onto every
// event type uniformly, since not every event type has a natural single
// amount or category.

import type { Severity } from "@/features/finance/aiAnalytics/models/enums";
import type { TimelineEventType } from "@/features/finance/aiAnalytics/engine/analyzers/timeline";

export type { TimelineEvent as Timeline, TimelineEventType } from "@/features/finance/aiAnalytics/engine/analyzers/timeline";

// TimelineEvent has no stored severity — budgetExceeded is the only event
// type in this timeline that represents bad news; every other type is a
// neutral/positive record (income received, a summary, a milestone).
export function severityForTimelineEvent(type: TimelineEventType): Severity {
  return type === "budgetExceeded" ? "warning" : "info";
}
