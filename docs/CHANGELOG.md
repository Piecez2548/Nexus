# Changelog

**Last Updated:** 2026-08-02

## Overview

This changelog is reconstructed directly from `git log` (52 commits, `26abcb9` → `4e9adb7`), grouped into milestones rather than listed commit-by-commit. `package.json` still declares `"version": "0.0.0"` — **no semantic versioning scheme is in use yet**; this document uses the term "version" loosely to mean development milestones.

## Current Version

`0.0.0` (package.json) — pre-release, actively developed, not yet tagged or published.

## Timeline

The full commit history spans **2026-07-25 to 2026-08-02** (8 days), with the AI Analytics module and several other major features landing on 2026-08-01 alone.

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
- Small info tooltips added to Dashboard cards/charts, translation strings updated (`47455b2`, `4e9adb7` — most recent commits as of this writing).

## Implemented Features

See [ROADMAP.md](ROADMAP.md)'s "Completed" section for the full current-state feature list across every module, and [MODULES.md](MODULES.md) for per-module detail.

## Upcoming Features

See [ROADMAP.md](ROADMAP.md)'s "Planned" and "Future" sections. Headline item: wiring the AI Gateway to a real LLM provider (needs a backend proxy first — see [SECURITY.md](SECURITY.md), [DECISIONS.md](DECISIONS.md)).

## Current Status

This changelog is accurate as of commit `4e9adb7` (2026-08-02).

## Future Improvements

Adopt semantic versioning (`package.json` is still at the Vite template default `0.0.0`) once the app reaches a state worth tagging releases for — see [DEPLOYMENT.md](DEPLOYMENT.md).
