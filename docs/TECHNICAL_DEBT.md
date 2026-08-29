# Technical Debt

**Last Updated:** 2026-08-30

## Overview

This document lists specific, verified issues found while reading the codebase for this documentation sprint — not a generic "things to watch for" list. Every item below was confirmed against actual source, not assumed from naming.

## Known Issues

- **`src/features/calendar/` is orphaned, and deliberately kept that way.** Contains exactly one file, `types/index.ts`, whose own header comment explains the Calendar feature was retired in favor of Life Schedule, and the type + `calendarEvents` Dexie table are kept only so existing user data isn't destroyed. Confirmed via grep: zero UI/nav/feature code references `CalendarEvent`; only generic, schema-agnostic infrastructure (sync, backup, encryption migration) touches it, and only because those enumerate every table name mechanically. Reviewed again 2026-08-21 and reaffirmed: keep indefinitely, no migration/export prompt planned. See [MODULES.md](MODULES.md).
- **The Gallery Slip Scanner (GS epic, 50/50) and Platform epic (PLT, 20/20) are complete and user-facing on web + Android, including a full physical tap-through.** The "Scan Gallery" button on the Transactions page (`GalleryScanFlow`) runs on the concurrent scan orchestrator (`useFullGalleryScan`) rather than the old sequential `useSlipScan` loop — on native it triggers real MediaStore auto-enumeration (`GalleryMediaPlugin.java`, including a date-range-bounded variant) instead of manual per-scan picking; the web fallback (file input) is unchanged. The native adapter (permission handling, enumeration, asset metadata, incremental cursor, byte-exact reads, pagination) was validated against a real device and a real ~2,500-image gallery, and the full button → bank popup → live progress dashboard → Import Preview → import chain was physically tapped through end to end — see [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md).

## Code Smells

- **Two parallel health calculations remain by design**, but their boundary is now explicit in code: `engine/analyzers/healthScore.ts` produces legacy `ruleHealthSignals` for exactly 4 recommendation rules, while `engine/scoring/` produces the weighted `financialHealthScore` used by UI and reports. The legacy `FinancialAnalysisResult.healthScore` field remains only for compatibility and is marked deprecated. Replacing the signals with the weighted score would change rule thresholds and is therefore not a safe mechanical consolidation.

## Large Components / Files

- **`src/features/finance/aiAnalytics/` is ~250 files** — by far the largest module. Its own internal structure (analyzers → scoring/behavior/forecast/recommendation → executiveSummary → coach, see [AI_ANALYTICS.md](AI_ANALYTICS.md)) is well-layered, but its sheer size means onboarding to this specific module takes meaningfully longer than any other.

## Potential Risks

- **Single-branch, direct-to-`main` git workflow** (confirmed: only `main` exists locally and on `origin`, no `.husky` hooks, no `CONTRIBUTING.md` before this sprint) — fine for a solo contributor, but would need a real branch/PR discipline before a second contributor joins, since CI (`ci.yml`) already supports `pull_request` triggers but nothing in the repo enforces using them.

## Areas Needing Improvement

None currently tracked here.

The production shared-chunk warning found during the 2026-08-29 validation pass is closed: bundle analysis identified React, Router, Motion, Supabase, and Sentry as the dominant stable vendor families. `vite.config.ts` now assigns those families to four Rolldown code-splitting groups; the entry chunk fell from about 824 kB to 134 kB minified and the normal production build no longer emits the warning. This is packaging-only — route boundaries and application behavior are unchanged — and all 76 Playwright cases passed afterward.

The former 5,209-line `src/i18n/translations.ts` merge-conflict hotspot is also closed. It is now a small compatibility facade over six bilingual domain modules in `src/i18n/locales/` (`core`, `finance`, `trading`, `life`, `security`, and `aiAnalytics`). Keeping each domain's English and Thai dictionaries together preserves review-time parity, while the composed `translations[language]` API and every existing key path remain unchanged. The parity test now also locks the complete top-level namespace list so losing the same namespace from both languages cannot pass unnoticed.

## Current Status

All items above are current findings verified by direct code reading; the translation count, production bundle, health-score boundary, header/search subscriptions, and store-backed AI Analytics computation hooks were re-checked through 2026-08-30. The AI Analytics hooks now select only their actual data collections, so unrelated loading/error/action changes cannot repeat the full analysis, health-trend, what-if, or category-detail calculations. Since the original 2026-08-02 audit, scoped AI Analytics passes landed for accessibility, analyzer/trend performance, and error/retry UX. PERF-003 aligned the analysis and trend reference time so their current scores cannot diverge at a clock boundary; the trend still computes that point independently. Store-level data-load error surfacing has also closed — see [AI_ANALYTICS.md](AI_ANALYTICS.md). The Gallery Slip Scanner and Platform epics are complete, followed by on-device stabilization, Slip Intelligence phases, native MediaStore validation, live orchestrator wiring, and physical end-to-end testing. Later deliveries include gallery-scan performance work, date-range scanning, Payment Notification Capture, Vault, Audit Log, Workout Tracker, and sync-engine hardening; see [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md) and [CHANGELOG.md](CHANGELOG.md) for detailed evidence.

## Future Improvements

Re-audit this list periodically as part of the `update` workflow (see `CLAUDE.md`) — technical debt documentation is only useful if it's re-verified against the code each time, not copy-pasted forward.
