# Nexus — Documentation

**Last Updated:** 2026-08-02

## Overview

Nexus is a local-first personal finance, trading journal, and productivity app. It tracks transactions, budgets, savings goals, trading positions, an investment portfolio, todos, habits, and a recurring daily schedule — all stored on-device in IndexedDB, with an optional, fully opt-in Supabase-backed sync and end-to-end encryption layer for multi-device use. A large rule-based "AI Analytics" subsystem computes financial health scores, behavior insights, forecasts, and recommendations entirely on-device, with **no LLM and no network calls** for any of it.

This `/docs` folder is the single source of truth for how the codebase is actually built today. It is generated from a direct reading of the source tree, not from planning documents — where something is planned but not built, it is explicitly marked **Planned**.

## Purpose

- Track day-to-day personal finances (income/expense/transfer/refund/adjustment transactions, accounts, categories, budgets, savings goals) with automatic recipient-based category learning.
- Track trading activity (a full trade journal with psychology/session/strategy metadata) and a manual buy-and-hold investment portfolio.
- Track daily productivity (todos, habits with streaks, a recurring daily schedule) with native reminder notifications.
- Surface all of the above through a local, rule-based analytics engine: a weighted Financial Health Score, behavior-pattern detection, short-term forecasts, an interactive what-if simulator, prioritized recommendations, an executive summary, and a keyword-driven Q&A "AI Coach" — all pure computation over the user's own data.
- Work fully offline as the default mode, with device-local PIN/biometric app lock and optional end-to-end-encrypted cloud sync for users who want their data on more than one device.

## Features

See [MODULES.md](MODULES.md) for the full per-module breakdown and [ROADMAP.md](ROADMAP.md) for what's built vs. planned. At a glance, currently implemented:

- **Finance**: transactions, accounts, categories, budgets, savings goals (with milestone events), recipient profiles with confidence-scored auto-categorization, a seeded merchant lookup, duplicate transaction/account/category merging, CSV/PDF/JSON export and CSV import, on-device Thai+English receipt-slip OCR (Tesseract.js).
- **AI Analytics**: Financial Health Score (weighted, explainable), a ~46-rule Rule Engine, a Behavior Analysis engine (9 detectors + 8 domain analyzers), a Forecast engine (linear projection + an interactive what-if scenario simulator), a Recommendation engine (difficulty/impact/timeline-enriched), an Executive Summary report, and a keyword-classified AI Coach Q&A — see [AI_ANALYTICS.md](AI_ANALYTICS.md).
- **Trading**: trade journal CRUD with full psychology/session/strategy metadata, a trading dashboard (win rate, profit factor, average RR, max drawdown, equity curve, drawdown chart, R-multiple risk distribution, per-session stats), CSV export, and heuristic (non-AI) market-type detection from a symbol.
- **Portfolio**: manual holdings tracker with cost basis, user-entered current price, and unrealized P/L.
- **Productivity**: Todo (priority + due date), Habit Tracker (daily/weekly streaks with a grace period, native reminders), Life Schedule (a recurring daily-routine timeline with drag-to-retime).
- **Security & Sync**: device-local PIN + biometric app lock, optional Supabase email/password auth, optional client-side AES-GCM encryption-at-rest with PBKDF2 key derivation and account-password-based key escrow/recovery, a generic push/pull sync engine with tombstone-based deletion propagation and last-write-wins conflict handling.
- **Cross-cutting**: full Thai/English i18n, dark/light/system/mono themes, a gamification layer (XP + levels + streaks), global search across every entity type, a Capacitor Android wrapper.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript, Vite 8 |
| Styling | Tailwind CSS v4 |
| State | Zustand 5 (global + per-feature stores) |
| Local database | Dexie 4 (IndexedDB), 14 schema versions to date |
| Forms & validation | React Hook Form + Zod 4, with a `schema(t: TranslateFn)` factory pattern for i18n'd errors |
| Routing | React Router 7 (`createBrowserRouter`, lazy-loaded route components) |
| Charts | Recharts |
| Cloud sync (optional) | Supabase (Postgres + Auth) |
| Encryption | Browser WebCrypto API (AES-GCM, PBKDF2) |
| OCR | Tesseract.js (on-device, Thai + English) |
| Native shell | Capacitor 8 (Android), plus an Electron desktop shell (`electron/`) |
| Error monitoring | Sentry (optional, `VITE_SENTRY_DSN`) |
| Testing | Vitest + Testing Library (unit/integration), Playwright (e2e) |
| Linting | oxlint |

## Installation

```bash
git clone <repository-url>
cd Nexus
npm install
cp .env.example .env   # optional — only needed for cloud sync / Sentry, see DEPLOYMENT.md
```

`postinstall` runs `patch-package` automatically (one patch is applied, see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).

## Development

```bash
npm run dev          # Vite dev server, http://localhost:5173
npm run electron:dev # dev server + Electron desktop shell together
```

The app works fully without any `.env` file — Supabase-backed sync and Sentry are both optional and no-op cleanly when unconfigured (see [SECURITY.md](SECURITY.md) and [DEPLOYMENT.md](DEPLOYMENT.md)).

## Folder Structure

Top-level layout (full tree in [PROJECT_TREE.md](PROJECT_TREE.md)):

```
src/
├── ai/            AI Gateway — designed, NOT wired into the app (see AI_ANALYTICS.md)
├── components/     Shared UI components, settings panels, import/export panels
├── database/       Dexie instance, encryption wrapper, repository/service factories, backup/seed
├── features/       One folder per domain module (see MODULES.md)
├── hooks/          Cross-cutting hooks (global search, notifications, click-outside, toast, theme)
├── i18n/           Translation dictionary + useTranslation hook
├── layouts/        App shell — sidebar, top bar, mobile nav, global search, menus
├── lib/            Third-party client setup (Supabase, Sentry)
├── pages/          Standalone top-level pages (Settings, NotFound)
├── providers/      App-wide side-effect components (theme)
├── router/         Route table + lazy page imports
├── store/          Global Zustand stores (toast, notifications, language, app settings, app lock, gamification)
├── styles/         Global CSS (Tailwind entry)
└── utils/          Cross-cutting pure utilities (CSV, dates, leveling, sync metadata, ...)
```

Each `src/features/<name>/` module follows the same internal shape: `components/`, `pages/`, `hooks/`, `store/`, `services/`, `repositories/`, `types/`, `schemas/` — see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) for the layering rules and [CODING_STANDARDS.md](CODING_STANDARDS.md) for naming conventions.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run build:analyze` | Production build with bundle visualizer (`ANALYZE=true`) |
| `npm run preview` | Preview a production build locally |
| `npm run lint` | Run oxlint |
| `npm test` | Run the Vitest unit/integration suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run Vitest with coverage |
| `npm run test:e2e` | Run the Playwright e2e suite |
| `npm run electron:dev` | Vite dev server + Electron shell together |
| `npm run electron:preview` | Build then launch Electron against the built output |
| `npm run electron:build` | Build then package Electron via electron-builder |
| `npm run cap:sync` | Build then `cap sync android` |
| `npm run cap:open` | Open the Android project in Android Studio |
| `npm run cap:build` | Build, sync, and assemble a debug Android APK |

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full build/release process on each target and [TESTING_GUIDE.md](TESTING_GUIDE.md) for the test strategy.

## Build

`npm run build` runs `tsc -b` (project-wide type check across `tsconfig.app.json` / `tsconfig.node.json`) and then `vite build`. CI (`.github/workflows/ci.yml`) runs lint → type-check → unit/integration tests → build → Playwright e2e on every push/PR to `main`.

## Future Roadmap

See [ROADMAP.md](ROADMAP.md) for the full Completed / In Progress / Planned / Future breakdown. Headline planned items: a real backend-driven multi-user architecture is explicitly **not** built (Supabase sync is a client-driven relay, not a backend service layer); the AI Gateway (`src/ai/`) is fully designed but intentionally not wired into any feature, reserved for a future real-LLM integration; there is no "disable encryption" flow yet, only enable/escrow/recover.
