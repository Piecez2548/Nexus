# Changelog

**Last Updated:** 2026-08-08

## Overview

This changelog is reconstructed directly from `git log` (72 commits, `26abcb9` → `HEAD`), grouped into milestones rather than listed commit-by-commit. `package.json` still declares `"version": "0.0.0"` — **no semantic versioning scheme is in use yet**; this document uses the term "version" loosely to mean development milestones.

## Current Version

`0.0.0` (package.json) — pre-release, actively developed, not yet tagged or published.

## Timeline

The full commit history spans **2026-07-25 to 2026-08-07**, with the AI Analytics module and several other major features landing on 2026-08-01 alone.

## Major Milestones

### Foundation (2026-07-25)
- Initial commit (`26abcb9`).
- Cloud sync sign-in requirement added when Supabase is configured (`aa266c1`).
- Early mobile-layout and cross-device sync data-mismatch fixes.

### Encryption-at-rest, staged rollout (2026-07-25, `6220551` → `c0688cd`)
Shipped as 8 explicitly-staged commits: crypto primitives + session key + repository plumbing (Stages 0-3) → Enable Encryption migration (Stage 4) → Forgot PIN recovery flow (Stage 5) → Settings UI (Stage 6) → backup service compatibility (Stage 7) → sync engine opaque-blob regression test (Stage 8) → server-side `user_encryption_keys` table + RLS. See [SECURITY.md](SECURITY.md) for the full design this shipped.

### Sync engine hardening (multiple dates)
A cluster of fixes addressing real cross-device race conditions as they were found: resurrected-deleted-rows on refresh, duplicate-`syncId` Postgres errors (two separate root causes, fixed in two separate commits), edits/deletes silently reverting when two devices synced near each other, and a speed-up from a 30s to a 5s sync interval (later re-confirmed/re-enabled after a regression).

### Life Modules (2026-07-26 onward)
- Habit Tracker — v1.0 scope, first Life Module (`0835933`, 2026-07-26).
- Portfolio — v1.0 scope, second Life Module (`28ba7eb`).
- Calendar — v1.0 scope, third Life Module (`79e9018`), later **replaced** by Life Schedule (see below) — this is why `src/features/calendar/` survives today only as an orphaned type declaration (see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).

### App Lock & biometrics
- Fingerprint unlock added as a supplementary alternative to the PIN.
- A device-crash fix for weak-class biometry (`isBiometricAvailable()` now checks `strongBiometryIsAvailable` specifically).
- A `patch-package` patch applied to `@capgo/capacitor-native-biometric` to fix a crash on every device — still applied on every `npm install` via `postinstall`.

### UX and platform polish
- A 4th "Mono" theme added, Login screen redesigned (twice — once for a "more premium look").
- Sentry error monitoring added (optional, `VITE_SENTRY_DSN`-gated).
- `TransactionDrawer`/`TradeDrawer` lazy-loaded, cutting the main bundle ~15%.
- PWA service worker registration skipped inside the Capacitor native WebView specifically to avoid serving a stale bundle after an APK update.
- Merge Duplicate Transactions added to Settings; Settings reorganized into clear groups with "Reset All Data" isolated in its own danger zone.

### Life Schedule replaces Calendar, Reminders subsystem added (2026-08-01, `5e38594`)
Calendar's dated-event UI was retired in favor of a recurring daily-routine timeline (Life Schedule), and a shared native-notification `reminders/` module was added, consumed by both Habits and Schedule. Same commit made form validation messages translatable and fixed local-date handling app-wide.

### Dashboard refactor + Goal Milestone Events (2026-08-01, `cc9ca4d`)
Dashboard rebuilt around real per-module preview panels (Budget, Habit, Portfolio, Schedule, Todo, Trading); Goal Milestone Events (25/50/75/100% crossing log) added to the finance module.

### AI Analytics — the largest single feature (2026-08-01, `5a9b896`)
One commit introducing the entire local, rule-based AI Analytics engine: Financial Health Score, Rule Engine (~46 rules), Recommendation Engine, Behavior Analysis Engine, Forecast & Trend Engine (with an interactive What-If simulator), Executive Summary Generator, AI Coach (16-intent Q&A), and the AI Gateway (`src/ai/`) — a designed-but-intentionally-unwired seam for a future real LLM provider. See [AI_ANALYTICS.md](AI_ANALYTICS.md) for the full architecture and the Sprint 1 status audit (P001–P011, all 11 pieces completed except the Gateway's integration).

### AI Analytics UI completion + consolidation (2026-08-01 → 2026-08-02)
- Forecast, What-If, and Executive Summary UI panels built to surface engine data that initially had no UI (`e58995f`).
- Duplicated math consolidated (clamp, coefficient-of-variation, percent-change helpers), dead code removed, health-score UI reconciled onto a single card (`3ad5f34`).
- Hardcoded-language strings fixed across notifications, insights, and encryption flows (`eab941f`).
- Global Search expanded to every entity type, and the resulting `TopBar` re-render regression fixed with narrow selectors + `memo()` (`9c8bc3c`).
- Recommendations section consolidated onto the richer `ActionableRecommendation` model (`55bc651`).
- Repository/service CRUD factories extracted, dead `ComingSoon` page removed (`4a84fd1`).
- Sync engine merge safety hardened: malformed-row guard + last-write-wins (`3909f1b`).
- Small info tooltips added to Dashboard cards/charts, translation strings updated (`47455b2`, `4e9adb7`).

### Documentation, task system, and AI Analytics quality passes (2026-08-07)
The `/docs` documentation set and a file-based `tasks/` registry (previously untracked working-tree artifacts) were committed, followed by four scoped AI Analytics passes — each output-preserving, with no change to financial calculations:
- **A11Y-001** — screen-reader and keyboard accessibility for the AI Analytics charts: a shared `ChartFigure` (`role="img"` + a data-driven `aria-label`) wraps every Recharts chart and the CSS-grid heatmap/calendar, the decorative merchant sparkline is hidden from assistive tech, and the recommendation disclosure gained `aria-expanded`/`aria-controls`. No visual change (`4134a56`).
- **PERF-001** — `monthlyValuesFor` rewritten as a single pass over transactions (O(months×N) → O(N)) with byte-identical output (`088f3ac`).
- **PERF-002** — a lean `computeHealthScoreSummary` lets score-trend points skip the explanation aggregation they discard; the full health score is unchanged (`ebc9f85`).
- **UX-001** — the AI Analytics error retry re-runs the analysis in place via a new `useFinancialAnalysis().retry()` instead of `window.location.reload()`, leaving all state outside the module untouched (`754a98f`).
- **UX-002** — hardened that retry: a synchronous engine throw now surfaces as an error state (the `analyze()` call is routed through `Promise.resolve().then(...)`) instead of hanging on `loading`, and retry re-fetches the finance stores before re-analysing (`86df606`).
- **A11Y-002** — a second accessibility pass: a global keyboard `:focus-visible` ring (`index.css`), a shared visually-hidden `ChartDataTable` exposing the key charts' numbers (score radars, health trend, monthly cash flow) to screen readers, a no-behaviour-flags empty state, and an `overflow-x-auto` wrapper on the desktop merchant table (`34acf5b`).

### Gallery Slip Scanner — foundation (2026-08-07 → 2026-08-08, `GS` epic, in progress)
A new, fully plugin-agnostic Gallery Slip Scanner is being built out under its own `GS` epic (the `MASTER_TASK.md` program, renumbered to avoid colliding with the existing `OCR-001…007`). Local commits, **not yet released**:
- **GS-005** — gallery permission manager spanning Android 13/14/15 + web, behind a `registerPlugin` native contract that degrades gracefully until an on-device media plugin is wired; `READ_MEDIA_IMAGES`/`READ_MEDIA_VISUAL_USER_SELECTED` manifest permissions (`3a3ba6e`).
- **GS-006** — plugin-agnostic scan orchestration: a `MediaProvider` interface with a web file-picker provider + a native stub, driving scan-all, incremental skip, duplicate prevention, progress, pause/resume/cancel, cooperative backgrounding, and resumable session persistence (Dexie v15) (`286adbf`).
- **GS-007** — concurrent scan queue: N self-balancing workers pulling lazily from the provider (the source is the backpressure), bounded retries with backoff, and a `ByteBudget` semaphore capping in-flight image bytes (memory protection + dynamic batching) (`c9b35e1`).
- **GS-008** — production scan cache (Dexie v16 `slipScanCache`) behind an injectable `ScanCache` interface: versioned entries (OCR/payload/parser) for staleness, skip-unchanged / re-scan-changed / re-scan-stale, a remembered-failure cross-run retry policy, and invalidation.

Native gallery enumeration and slip extraction (QR → EMVCo → OCR) are pending later GS tasks; the scanner is web-picker-only until then. See [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md)'s GS epic.

## Implemented Features

See [ROADMAP.md](ROADMAP.md)'s "Completed" section for the full current-state feature list across every module, and [MODULES.md](MODULES.md) for per-module detail.

## Upcoming Features

See [ROADMAP.md](ROADMAP.md)'s "Planned" and "Future" sections. Headline item: wiring the AI Gateway to a real LLM provider (needs a backend proxy first — see [SECURITY.md](SECURITY.md), [DECISIONS.md](DECISIONS.md)).

## Current Status

This changelog is accurate as of the 2026-08-08 Gallery Slip Scanner foundation work (GS-005 → GS-008), which builds on the 2026-08-07 documentation and AI Analytics quality passes.

## Future Improvements

Adopt semantic versioning (`package.json` is still at the Vite template default `0.0.0`) once the app reaches a state worth tagging releases for — see [DEPLOYMENT.md](DEPLOYMENT.md).
