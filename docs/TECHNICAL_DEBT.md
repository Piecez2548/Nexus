# Technical Debt

**Last Updated:** 2026-08-08

## Overview

This document lists specific, verified issues found while reading the codebase for this documentation sprint — not a generic "things to watch for" list. Every item below was confirmed against actual source, not assumed from naming.

## Known Issues

- **`src/features/calendar/` is orphaned.** Contains exactly one file, `types/index.ts`, whose own header comment explains the Calendar feature was retired in favor of Life Schedule, and the type + `calendarEvents` Dexie table are kept only so existing user data isn't destroyed. Confirmed via grep: zero UI/nav/feature code references `CalendarEvent`; only generic, schema-agnostic infrastructure (sync, backup, encryption migration) touches it, and only because those enumerate every table name mechanically. See [MODULES.md](MODULES.md).
- **`src/components/ui/FileField.tsx` has zero importers.** Confirmed via repo-wide grep — not referenced by any component, page, or test. `MultiFileField.tsx` (its apparent successor, used by `TradeMetaFields.tsx`) appears to have superseded it. Dead code, safe to remove or worth a comment explaining why it's kept.
- **No "disable encryption" flow exists.** `appLockStore.ts`'s `disableLock()` explicitly refuses to run while `encryptionEnabled` is true, with a comment stating encryption must be disabled first via "a separate, not-yet-built flow." `EncryptionSettings.tsx` has no UI for it either. A user who enables encryption today has no way to turn it back off through the app.
- **`PLAINTEXT_KEYS` (which fields stay unencrypted per table) is hand-duplicated in three places** with no single source of truth: each `createRepository()` call's `plaintextKeys` option, `backupService.ts`, and `enableEncryption.ts`. Each file's own comment acknowledges this and says the three must be kept in sync manually. A drift between them would be a subtle, hard-to-detect bug (e.g. a field silently encrypted in one path and not another).
- **Root `README.md` is still the unmodified Vite template** ("React + TypeScript + Vite... This template provides a minimal setup..."). The real project documentation now lives entirely in `/docs` — worth either replacing the root README with a short pointer to `/docs/README.md`, or leaving it as-is with an explicit note, since right now a first-time visitor to the repo root sees generic scaffolding text instead of what the project actually is.
- **`package.json` version is still `0.0.0`** (the Vite template default) despite the app being under active, substantial development — see [CHANGELOG.md](CHANGELOG.md).
- **Store-level data-load errors are not surfaced on the AI Analytics page.** The 6 finance stores each track their own `error`, but `AiAnalytics.tsx` only renders `ErrorState` for an *analysis* error — a failed `load*()` falls through to the empty state instead. UX-002 made the retry re-fetch the stores, so recovery works once the user retries, but a load failure still shows "no data" rather than an error. Not yet a registered task.
- **The Gallery Slip Scanner (GS epic) is now wired into the app on web; native gallery access is the remaining gap.** The full headless pipeline + AI layers (~297 slipScanner tests): scan orchestration + queue + cache (GS-005–GS-008), the extraction engine QR → EMVCo → bank → OCR-fallback → dedup (GS-009–GS-013), the `SlipCandidate` model + Import Preview + Smart Import (GS-014–GS-016), the security/perf/validation/analytics layers (GS-017–GS-020), the refinement engines (GS-023–GS-039), and the deterministic, advisory AI layers (verification, fraud, categorization, merchant intelligence, learning, confidence, linking, spending intelligence, quality review, report — GS-041–GS-050). **The GS epic is complete (50/50).** The `PLT` platform epic added four genuinely-new frameworks under `src/platform/` (Event Bus, Feature Flags, Command Palette, Local Telemetry); the rest reuse existing systems (see [../tasks/Platform/PLATFORM_DESIGN.md](../tasks/Platform/PLATFORM_DESIGN.md)). It is now **user-facing on web**: a "Scan Gallery" button on the Transactions page (`GalleryScanFlow`) drives the real flow — bank selection → file picker → real jsQR + Tesseract extraction (`extractSlipCandidate` + `useSlipScan`) → Import Preview → Smart Import. Remaining gaps: (1) the native gallery path uses `@capacitor/camera`'s `pickImages` (a per-selection picker), wired but **pending `npx cap sync android` + an on-device test** — it has not been run on a device; and (2) full-gallery *auto*-enumeration (the `NativeMediaProvider` / MediaStore path behind the 50k design) is still a stub — the shipping path today is the picker, not whole-library auto-scan. Smaller placeholders: scan-cache engine versions are `"0"` and `SlipCandidate.confidence` is a transparent heuristic (`basicConfidence`) pending the Confidence Engine (GS-046). See [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md)'s GS epic.

## Code Smells

- **Two parallel "health score" computations coexist by design, not by accident**, but this is still worth flagging as a comprehension hazard for new contributors: `engine/analyzers/healthScore.ts` (older, unweighted, no UI card anymore) and `engine/scoring/` (newer, weighted, has the page's sole health-score UI). The old one is still computed every run and still feeds exactly 4 rules — a reader skimming the codebase could easily assume it's dead. Both `AI_ANALYTICS.md` and inline code comments now document this explicitly, which mitigates but doesn't eliminate the risk.
- **`useGlobalSearch.ts` uses whole-store destructuring across all 11 data stores** rather than narrow selectors — a deliberate, accepted exception (see [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)) because it's isolated behind `GlobalSearch`'s own `memo()` boundary. Still worth watching if `GlobalSearch` is ever refactored to lose that boundary.

## Large Components / Files

- **`src/i18n/translations.ts` is 3,736 lines** — a single flat file holding every translation key for both languages. It works because keys are logically namespaced (`aiAnalytics.*`, `dashboard.*`, `settings.*`, ...), but it's the single largest source file in the app and every feature that adds UI text has to touch it, making it a near-guaranteed merge-conflict point if the project ever has multiple concurrent contributors.
- **`src/features/finance/aiAnalytics/` is ~250 files** — by far the largest module. Its own internal structure (analyzers → scoring/behavior/forecast/recommendation → executiveSummary → coach, see [AI_ANALYTICS.md](AI_ANALYTICS.md)) is well-layered, but its sheer size means onboarding to this specific module takes meaningfully longer than any other.
- **`src/layouts/TopBar.tsx` subscribes to 12 different stores** to eagerly load header-widget data on every route. Already tuned once for a real perf regression (narrow selectors + `memo()` on its children — see [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)); flagged here only as the natural place to look first if a future feature needs to add a 13th store subscription and the pattern starts to strain.

## Future Refactoring

- Consolidate `PLAINTEXT_KEYS` into one exported constant (see "Known Issues" above) — the most concrete, low-risk refactor identified.
- Decide the fate of `src/features/calendar/` — either commit to keeping `calendarEvents` indefinitely (and document why, e.g. "some users may still have data in it"), or design a one-time migration/export prompt so the table and its orphaned type can eventually be removed.
- Replace or annotate the root `README.md`.
- **Deduplicate the AI Analytics score-trend's "current" point.** `useFinancialHealthTrend` and `useFinancialAnalysis` each capture their own `now`, so the trend's "now" point re-runs `buildScoreContext` for a health score the main pipeline just computed. Deduping it deterministically requires the two hooks to share one `now` timestamp (a small UI-level change), so it was deliberately left out of PERF-002. Scoped as **PERF-003**. PERF-001 (single-pass `monthlyValuesFor`) and PERF-002 (lean score-trend summary) already reduced the surrounding per-point cost — see [AI_ANALYTICS.md](AI_ANALYTICS.md).

## Potential Risks

- **Data loss risk if a user enables encryption and later needs to disable it** (e.g. to hand off a device, or if the app's encryption code has a bug) — there is currently no supported path back to plaintext short of a full export/reset/re-import cycle via `backupService.exportBackup()`/`resetAllData()`, which is manual and easy to get wrong under pressure.
- **`translations.ts`'s size is a scaling risk, not a correctness risk today** — if the app adds many more features at the current pace, this file could become unwieldy enough to warrant splitting per-feature, even though the current flat structure with namespaced keys is entirely functional.
- **Single-branch, direct-to-`main` git workflow** (confirmed: only `main` exists locally and on `origin`, no `.husky` hooks, no `CONTRIBUTING.md` before this sprint) — fine for a solo contributor, but would need a real branch/PR discipline before a second contributor joins, since CI (`ci.yml`) already supports `pull_request` triggers but nothing in the repo enforces using them.

## Areas Needing Improvement

- **Automated key-parity checking for `translations.ts`** — this audit spot-checked `en` vs `th` block sizes for the `aiAnalytics` namespace (974 vs 960 lines, closely matched) but did not run a full automated key-by-key diff across the whole file. A CI check that fails when a key exists in one language but not the other would close this gap permanently rather than relying on manual spot-checks.
- **`LoadingState`'s default label is hardcoded English** (`"Loading..."`), not run through `useTranslation()` — every actual call site does pass a translated `label` explicitly, so this isn't user-visible today, but the component's own default silently breaks the app's i18n discipline if a future call site omits the prop.

## Current Status

All items above are current findings verified by direct code reading, re-checked during the 2026-08-07 `update` pass. Since the original 2026-08-02 audit, six scoped AI Analytics passes landed — A11Y-001 and A11Y-002 (chart accessibility, a global keyboard focus ring, screen-reader data tables), PERF-001 and PERF-002 (analyzer/trend performance), and UX-001/UX-002 (retry without a full-page reload, plus surfacing a synchronous engine throw as an error state and re-fetching data on retry). The remaining follow-up they surfaced, PERF-003 (trend "current"-point dedup), is recorded above.

## Future Improvements

Re-audit this list periodically as part of the `update` workflow (see `CLAUDE.md`) — technical debt documentation is only useful if it's re-verified against the code each time, not copy-pasted forward.
