// Shared, dependency-free math helpers used across every sub-engine
// (scoring, behavior, coach, recommendation, forecast, executiveSummary) —
// consolidated here after the same 3-line clamp() had been independently
// reimplemented in 14 files across the aiAnalytics subsystem.
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
