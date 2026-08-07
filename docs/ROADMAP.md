# Roadmap

**Last Updated:** 2026-08-02

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

Nothing is currently mid-build in the repository as of this writing — the most recent commits (`3909f1b` → `4e9adb7`) were a consolidation/hardening/documentation pass over already-shipped features, not new in-progress work.

## Planned

Items explicitly implied as unfinished by the current architecture, in rough order of how directly the existing code already supports them:

- **AI Gateway integration** — the seam (`AIProvider`, `LocalRuleProvider`) is fully built; wiring a real LLM provider (e.g. Claude) needs a backend proxy first, since an API key cannot safely live in client code. See [SECURITY.md](SECURITY.md), [DECISIONS.md](DECISIONS.md).
- **"Disable encryption" flow** — explicitly blocked in `appLockStore.ts` today with a comment naming it as future work; only enable/escrow/recover exist.
- **Net Worth tracking** (assets/liabilities, net worth over time) — no `assets`/`liabilities` tables exist.
- **Subscription Manager as a first-class entity** (renewal dates, reminders) — duplicate-subscription *detection* exists (`spendingAlerts.ts`, the Rule Engine), but nothing manages subscriptions as their own tracked entity yet.
- **Merchant Database management UI** — `merchants` is currently seed-only, no CRUD exists (`merchantRepository.ts` is read-only by design).
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
