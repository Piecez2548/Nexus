# Technical Debt

**Last Updated:** 2026-08-21

## Overview

This document lists specific, verified issues found while reading the codebase for this documentation sprint — not a generic "things to watch for" list. Every item below was confirmed against actual source, not assumed from naming.

## Known Issues

- **`src/features/calendar/` is orphaned, and deliberately kept that way.** Contains exactly one file, `types/index.ts`, whose own header comment explains the Calendar feature was retired in favor of Life Schedule, and the type + `calendarEvents` Dexie table are kept only so existing user data isn't destroyed. Confirmed via grep: zero UI/nav/feature code references `CalendarEvent`; only generic, schema-agnostic infrastructure (sync, backup, encryption migration) touches it, and only because those enumerate every table name mechanically. Reviewed again 2026-08-21 and reaffirmed: keep indefinitely, no migration/export prompt planned. See [MODULES.md](MODULES.md).
- **`package.json` version is still `0.0.0`** (the Vite template default) despite the app being under active, substantial development — see [CHANGELOG.md](CHANGELOG.md).
- **The Gallery Slip Scanner (GS epic, 50/50) and Platform epic (PLT, 20/20) are complete and user-facing on web + Android, including a full physical tap-through.** The "Scan Gallery" button on the Transactions page (`GalleryScanFlow`) runs on the concurrent scan orchestrator (`useFullGalleryScan`) rather than the old sequential `useSlipScan` loop — on native it triggers real MediaStore auto-enumeration (`GalleryMediaPlugin.java`, including a date-range-bounded variant) instead of manual per-scan picking; the web fallback (file input) is unchanged. The native adapter (permission handling, enumeration, asset metadata, incremental cursor, byte-exact reads, pagination) was validated against a real device and a real ~2,500-image gallery, and the full button → bank popup → live progress dashboard → Import Preview → import chain was physically tapped through end to end — see [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md).

## Code Smells

- **Two parallel "health score" computations coexist by design, not by accident**, but this is still worth flagging as a comprehension hazard for new contributors: `engine/analyzers/healthScore.ts` (older, unweighted, no UI card anymore) and `engine/scoring/` (newer, weighted, has the page's sole health-score UI). The old one is still computed every run and still feeds exactly 4 rules — a reader skimming the codebase could easily assume it's dead. Both `AI_ANALYTICS.md` and inline code comments now document this explicitly, which mitigates but doesn't eliminate the risk.
- **`useGlobalSearch.ts` uses whole-store destructuring across all 11 data stores** rather than narrow selectors — a deliberate, accepted exception (see [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)) because it's isolated behind `GlobalSearch`'s own `memo()` boundary. Still worth watching if `GlobalSearch` is ever refactored to lose that boundary.

## Large Components / Files

- **`src/i18n/translations.ts` is 4,350 lines** (up from 3,736) — a single flat file holding every translation key for both languages. It works because keys are logically namespaced (`aiAnalytics.*`, `dashboard.*`, `settings.*`, ...), but it's the single largest source file in the app and every feature that adds UI text has to touch it, making it a near-guaranteed merge-conflict point if the project ever has multiple concurrent contributors.
- **`src/features/finance/aiAnalytics/` is ~250 files** — by far the largest module. Its own internal structure (analyzers → scoring/behavior/forecast/recommendation → executiveSummary → coach, see [AI_ANALYTICS.md](AI_ANALYTICS.md)) is well-layered, but its sheer size means onboarding to this specific module takes meaningfully longer than any other.
- **`src/layouts/TopBar.tsx` subscribes to 12 different stores** to eagerly load header-widget data on every route. Already tuned once for a real perf regression (narrow selectors + `memo()` on its children — see [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)); flagged here only as the natural place to look first if a future feature needs to add a 13th store subscription and the pattern starts to strain.

## Potential Risks

- **`translations.ts`'s size is a scaling risk, not a correctness risk today** — if the app adds many more features at the current pace, this file could become unwieldy enough to warrant splitting per-feature, even though the current flat structure with namespaced keys is entirely functional.
- **Single-branch, direct-to-`main` git workflow** (confirmed: only `main` exists locally and on `origin`, no `.husky` hooks, no `CONTRIBUTING.md` before this sprint) — fine for a solo contributor, but would need a real branch/PR discipline before a second contributor joins, since CI (`ci.yml`) already supports `pull_request` triggers but nothing in the repo enforces using them.

## Areas Needing Improvement

None currently tracked here.

## Current Status

All items above are current findings verified by direct code reading, re-checked during the 2026-08-21 pass. Since the original 2026-08-02 audit, six scoped AI Analytics passes landed — A11Y-001 and A11Y-002 (chart accessibility, a global keyboard focus ring, screen-reader data tables), PERF-001 and PERF-002 (analyzer/trend performance), and UX-001/UX-002 (retry without a full-page reload, plus surfacing a synchronous engine throw as an error state and re-fetching data on retry); PERF-003 (trend "current"-point dedup) and store-level data-load error surfacing (left open by UX-002) have both since closed too — see [AI_ANALYTICS.md](AI_ANALYTICS.md). The Gallery Slip Scanner (GS) and Platform (PLT) epics then completed (50/50 + 20/20), followed by an on-device stabilization pass and two code-review passes over the scanner. The 2026-08-15 Slip Intelligence Phases 1-9 closed the confidence-engine, smart-duplicate, conflict-resolver, recovery-system, and category-learning-UI gaps that earlier passes had left wired-but-inert, and implemented the native full-gallery MediaStore plugin. The native adapter was then validated against a real device (finding and fixing a real pagination bug no code-level test could have caught — `LIMIT`/`OFFSET` appended to a MediaStore sort-order string, believed portable, threw `IllegalArgumentException` on-device), the orchestrator was wired into the live "Scan Gallery" button, and the full flow was physically tap-tested end to end — closing the one gap the previous pass had left open. Since then: a gallery-scan speed investigation (Tesseract worker-pool reuse, QR-recovery bounding), date-range scanning, Payment Notification Capture (Phase 1 + an income/expense type selector), Vault, an app-wide Audit Log, Workout Tracker, and a second sync-engine hardening round (a push-cursor self-heal migration, automatic account/category duplicate merging) all landed — see [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md) and [CHANGELOG.md](CHANGELOG.md) for the detailed notes.

## Future Improvements

Re-audit this list periodically as part of the `update` workflow (see `CLAUDE.md`) — technical debt documentation is only useful if it's re-verified against the code each time, not copy-pasted forward.
