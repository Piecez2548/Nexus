# Roadmap

**Last Updated:** 2026-08-15

## Overview

This roadmap replaces the previous version (last updated 2026-07-21), which was written before Trading, Portfolio, Todo, Habits, Life Schedule, Sync, Encryption, App Lock, and the entire AI Analytics engine existed in their current form — most of what it listed as "not started" is now built. This version is derived directly from the current source tree (see [MODULES.md](MODULES.md), [AI_ANALYTICS.md](AI_ANALYTICS.md)), not from an external blueprint document. Checkboxes are a backlog, not a commitment.

## Completed

### Finance
- [x] Transactions (5 types: income/expense/transfer/refund/adjustment), Accounts, Categories — full CRUD, in-use delete guards, duplicate merge
- [x] Budgets (recurring, per-category, live progress) and Savings Goals (with a 25/50/75/100% milestone-event log)
- [x] Recipient-based Learning Engine (confidence-scored auto-categorization) + seeded Merchant Database fallback
- [x] Recipient Profiles page (view/delete, read-only — profiles are server-derived)
- [x] Duplicate transaction/account/category detection and merge
- [x] Thai + English on-device receipt-slip OCR (Tesseract.js) with regex-based parsing
- [x] CSV/PDF/JSON export, CSV import with validation preview
- [x] Quick Add transaction templates, Favorites

### AI Analytics (rule-based, fully local — see [AI_ANALYTICS.md](AI_ANALYTICS.md) and the Sprint 1 P001–P011 audit)
- [x] Weighted, explainable Financial Health Score (7 sub-scores)
- [x] Rule Engine (~46 rules across 15 categories)
- [x] Recommendation Engine (difficulty/timeline/impact-enriched)
- [x] Behavior Analysis Engine (9 detectors, 8 domain analyzers, spending-style classification)
- [x] Forecast & Trend Engine, including an interactive What-If scenario simulator
- [x] Executive Summary Generator
- [x] AI Coach (16-intent keyword-classified Q&A)
- [x] AI Gateway infrastructure (`src/ai/`) — built, tested, **not yet wired into the app**

### Trading & Portfolio
- [x] Trading Journal — full trade CRUD with psychology/session/strategy metadata
- [x] Trading Dashboard — win rate, profit factor, average RR, max drawdown, equity curve, drawdown chart, R-multiple risk distribution, per-session stats, performance calendar
- [x] Heuristic (non-AI) market-type detection, CSV export
- [x] Portfolio — manual holdings tracker with cost basis and unrealized P/L

### Productivity
- [x] Todo (priority, due date, filters)
- [x] Habit Tracker (daily/weekly streaks with grace period, native reminders)
- [x] Life Schedule (recurring daily-routine timeline, drag-to-retime, live current-activity tracking) — replaced the earlier Calendar feature

### Security & Sync
- [x] Device-local PIN + biometric App Lock, auto-lock timeout
- [x] Supabase email/password authentication (optional, no-op if unconfigured)
- [x] Client-side AES-GCM encryption-at-rest, PBKDF2 key derivation, account-password-based escrow/recovery
- [x] Generic push/pull sync engine, tombstone-based deletion propagation, last-write-wins conflict handling, malformed-row guard

### Platform & cross-cutting
- [x] Full Thai/English i18n (validation messages included, via a `TranslateFn`-factory pattern)
- [x] Dark/light/system/mono themes
- [x] Gamification layer (XP, levels, streaks)
- [x] Global search across every entity type
- [x] Capacitor Android build (APK), Electron desktop shell
- [x] Sentry error monitoring (optional)
- [x] CI pipeline (lint, type-check, unit/integration tests, build, e2e) on every push/PR to `main`

## In Progress

- **Gallery Slip Scanner** (`GS` epic — see [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md) and `MASTER_TASK.md`) — a production, plugin-agnostic gallery scanner, **complete (GS 50/50 + PLT 20/20)** and **verified on-device**. The full pipeline: scan foundation (permission manager, `MediaProvider` orchestration, concurrent queue, versioned cache, GS-005–GS-008); extraction (QR detection, EMVCo/PromptPay parsing, plugin-based bank identification, OCR fallback reusing the existing Tesseract engine, slip-level dedup, GS-009–GS-013); the `SlipCandidate` model, bank-selection popup, Import Preview and Smart Import with batch/progress/resume/rollback (GS-014–GS-016); security/performance/validation/analytics layers (GS-017–GS-020); a refinement wave (GS-023–GS-039) — battery-aware scan scheduler, image hash + perceptual hash, slip validation, QR recovery (rotate/brighten/contrast retries), image enhancement, a per-field OCR engine, a slip classifier, a bank template engine, a graded-probability duplicate engine, an import conflict resolver, a background worker, a scan-progress dashboard, import history, a performance monitor, a recovery system, a security audit layer, dev tools; and the deterministic, advisory AI layers (GS-041–GS-050) — slip verification, fraud detection, transaction categorization with learning, merchant intelligence, a smart learning engine, a confidence engine, transaction linking, spending intelligence, quality review, and a financial intelligence report. The `PLT` platform epic landed alongside it: genuinely-new frameworks (Event Bus, Feature Flags, Command Palette, Local Telemetry, `src/platform/`) plus the rest mapped to existing systems (see [../tasks/Platform/PLATFORM_DESIGN.md](../tasks/Platform/PLATFORM_DESIGN.md)), certified at PLT-020.

  **Post-launch stabilization** — with both epics complete, the native picker was verified on a real Android device against real Thai bank slips, surfacing bugs (wrong amounts, unidentified banks, poor merchant/title extraction, an on-device QR-decode fallback gap) fixed as found, followed by two code-review passes over the whole pipeline (bank identification for real EMVCo banks, category-learning wiring, adaptive OCR preprocessing, dead-code consolidation, several `slipParser.ts` edge cases — and a second pass catching regressions the first pass introduced). See [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md)'s "Post-Launch Stabilization" section and [CHANGELOG.md](CHANGELOG.md).

  **Slip Intelligence, Phases 1-9 (2026-08-15)** — a follow-up architecture review found several engines built and fully tested but never called from production, and two entirely separate scan pipelines that had never been integrated. Nine phases closed these gaps: wired the Confidence Engine, Smart Duplicate Engine, Import Conflict Resolver, and Recovery System into production; added a confidence-tier auto-import policy; a Review Queue UI (`ReviewEditForm`) that lets a person correct a scanned slip's amount/merchant/category, closing the category-learning write-side gap; a real Import History screen; checkpoint-write throttling verified at 10k images; and `GalleryMediaPlugin.java`, a real native Android MediaStore plugin backing full-gallery auto-enumeration (compiles and packages; **not yet validated on a physical device**, and its orchestrator-driven scan UI, `FullGalleryScanPanel`, has no live nav entry point yet — both pending an on-device pass). See [CHANGELOG.md](CHANGELOG.md) and [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) for the detailed breakdown and what's left open.

## Planned

Items explicitly implied as unfinished by the current architecture, in rough order of how directly the existing code already supports them:

- **AI Gateway integration** — the seam (`AIProvider`, `LocalRuleProvider`) is fully built; wiring a real LLM provider (e.g. Claude) needs a backend proxy first, since an API key cannot safely live in client code. See [SECURITY.md](SECURITY.md), [DECISIONS.md](DECISIONS.md).
- **"Disable encryption" flow** — explicitly blocked in `appLockStore.ts` today with a comment naming it as future work; only enable/escrow/recover exist.
- **Net Worth tracking** (assets/liabilities, net worth over time) — no `assets`/`liabilities` tables exist.
- **Subscription Manager as a first-class entity** (renewal dates, reminders) — duplicate-subscription *detection* exists (`spendingAlerts.ts`, the Rule Engine), but nothing manages subscriptions as their own tracked entity yet.
- **Merchant Database management UI** — `merchants` is currently seed-only, no CRUD exists (`merchantRepository.ts` is read-only by design).
- **Gallery Scanner: physically tap-test the live native "Scan Gallery" flow on-device.** The native adapter (`GalleryMediaPlugin.java`) is now device-validated at the plugin level and wired into the live "Scan Gallery" button (`GalleryScanFlow` runs on `useFullGalleryScan`), but no one has yet physically tapped through the button → bank popup → live progress dashboard → Import Preview → import on a real screen. See [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).
- **Deeper Trading analytics** — expectancy, average holding time, strategy comparison, a named Strategy Library, a Playbook, Trade Replay, Watchlist, Economic Calendar.
- **Risk Management config** (max daily/weekly loss limits + alerts) for Trading.
- **Reports module** — no `Reports` page or route exists at all (not even a stub) as of this writing.

## Future

Larger initiatives with no code-level scaffolding yet:

- **Push notifications** (FCM/APNs/Web Push) — the current `reminders/` module is native-local-only (Capacitor local-notifications), not a push infrastructure.
- **Automation** (IF/THEN workflows, scheduled reports/alerts).
- **2FA and login history** — current security is PIN/biometric (device-local) + Supabase email/password (account-level); no second factor or login-history surface exists.
- **iOS build** — only an Android Capacitor project exists (`android/`, 53 tracked files); no `ios/` project directory exists in the repository.
- **A real backend / multi-user architecture** — Supabase is used only as an auth provider + a generic sync relay (see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)); there is no server-side business logic, and none is currently planned. See [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)'s "Future Backend Architecture."
- **Semantic versioning / tagged releases** — `package.json` is still at `0.0.0`.

## Current Status

This roadmap reflects the repository exactly as of commit `4e9adb7` (2026-08-02) — regenerate against the code, not this document, if a long time has passed since this date.

## Future Improvements

Consider re-deriving this roadmap automatically (e.g. from route table + module folder presence) rather than by hand, given how quickly it went stale last time (12 days between the previous update and this one, during which most of the "Not started" list was built).
