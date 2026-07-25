# Nexus Roadmap

Derived from `Nexus_Project_Blueprint.pdf` and the current state of this repo. Checkboxes are a backlog, not a commitment — reorder as priorities shift.

## Current state (2026-07-21)

- **Stack in use:** Vite + React 19 + TypeScript + Tailwind v4, Zustand, Dexie (IndexedDB), React Hook Form + Zod, Recharts. This is a local-first frontend — the blueprint's backend (NestJS + PostgreSQL + Prisma + Redis) does not exist yet.
- **Architecture:** Feature-First — each domain lives under `src/features/<name>/` with its own `components/`, `pages/`, `hooks/`, `store/`, `services/`, `repositories/`, `types/`, `schemas/`. UI never touches Dexie directly: components → store → service → repository → `src/database/db.ts`. Shared code lives at `src/{components,hooks,layouts,providers,contexts,config,constants}/`. All cross-folder imports use the `@/` alias (see `tsconfig.app.json` / `vite.config.ts`).
- **Built:** Dashboard (`src/features/dashboard/` — balance/income/expense/saving cards, cash flow bar chart, expense pie chart, recent transactions, AI Analytics insights panel), Finance (`src/features/finance/`) — Transactions (income/expense/transfer/refund/adjustment, with tags/attachment/time/status/recurring metadata), Accounts (full CRUD, in-use delete guard), Categories (full CRUD, merge, in-use delete guard), **Budget** (per-category recurring budgets with live progress against real spend), **Saving Goals** (target/current tracking with quick contributions), **Rule Engine + Learning Engine** (recipient-keyed auto-categorization that learns from transaction history, falls back to a seeded merchant database, with a Recipient Profiles page for transparency/control), **rule-based "AI Analytics"** (category month-over-month spend spikes, duplicate-subscription detection, unusual single-transaction flags — all pure computation, no LLM); Trading (`src/features/trading/`) — Trading Journal (full trade CRUD: symbol/market/direction/entry-exit/risk fields/before-after psychology/strategy/session/tags/screenshots) and a Trading Dashboard computing win rate, profit factor, average RR, max drawdown, today/weekly/monthly P/L, and best/worst strategy; layout shell (`src/layouts/`), theme system (`src/providers/ThemeProvider.tsx` + `src/contexts/ThemeContext.tsx` + `src/config/themes.ts`).
- **Stubbed:** Reports and Settings routes still render "Coming Soon" (`src/pages/`, wired in `src/router/router.tsx`).
- **Data model so far:** Dexie v5 tables `transactions` (5 types, tags/attachment/time/status/recurring/recipient), `accounts`, `categories`, `trades`, `recipientProfiles` (learned category mappings keyed by recipient), `merchants` (seeded fallback lookup), `budgets`, `goals` — see `src/database/db.ts` and each feature's `types/`. Net-worth/subscriptions tables not started; Trading Analytics/Psychology-as-workflow/Risk Management config/Strategy Library/Playbook/Trade Replay/AI Coach not started.
- **Explicitly NOT built (needs infrastructure decisions first):** Authentication (Register/Login/Google/Apple/JWT — needs a real backend or auth provider), OCR receipt scanning (cloud API vs. client-side Tesseract.js is an open architecture choice), the conversational AI Assistant (needs a real LLM API + backend proxy — cannot safely hold an API key in client code), Android/iOS native apps. See "Nexus Finance PRD infrastructure gap" in Open Questions.
- **Not started otherwise:** everything below; no backend, no AI integration, no auth.

## Phase 1 — Core

Goal: finish the modules everything else depends on, staying on the current local-first (Dexie) stack.

### 1.1 Finance (extends existing work)
- [x] Foundation — expanded transaction schema (income/expense/transfer/refund/adjustment, tags, attachment, time, status, recurring), Accounts CRUD, Categories CRUD + merge, delete guards preventing orphaned references
- [x] Budget — recurring monthly/weekly/yearly budgets per category, with progress computed live against actual spend for the current period
- [x] Financial Goals — savings goal progress with target/current tracking and quick contributions
- [x] Rule Engine + Learning Engine — recipient-keyed category auto-suggestion/auto-fill, learns from transaction history (confidence score grows with usage), falls back to a seeded Merchant Database matched against the transaction title; Recipient Profiles page for visibility/control (view, delete)
- [x] Rule-based "AI Analytics" — category month-over-month spend increases, duplicate-subscription detection (recurring transactions sharing a category), unusually large single transactions vs. category history; surfaced on the Dashboard. Pure computation, no LLM — see open question on the real AI Assistant below.
- [ ] Net Worth — assets/liabilities tracking, net worth over time (new `assets`/`liabilities` tables)
- [ ] Subscription Manager — renewal reminders as a dedicated feature (the transaction-level `recurring` field stores frequency metadata and duplicate-subscription detection already exists, but nothing manages subscriptions as first-class entities with renewal dates yet)
- [ ] Merchant Database management UI (currently seed-only, no CRUD — `src/database/seed.ts`)
- [ ] Replace the Reports stub with a first real slice: daily/weekly/monthly cash flow view
- [ ] Search/Filter/Sort polish on Transactions (keyword/category/account/date range/amount range/tag search; sort by newest/oldest/amount/alphabetical) — the type filter dropdown already covers all 5 types, but full search+sort per the blueprint is still open

### 1.2 Investment (new module)
- [ ] Portfolio — holdings + cost basis + current value (`holdings`, `investmentTransactions` tables)
- [ ] Asset Allocation — breakdown by asset class/sector
- [ ] DCA Planner
- [ ] Dividend Tracker
- [ ] Rebalancing suggestions

### 1.3 Productivity (baseline, new module)
- [ ] Todo
- [ ] Smart Calendar (basic, no AI scheduling yet)
- [ ] Habit Tracker
- [ ] Journal
- [ ] Goal Management (reconcile with Financial Goals — see open question)

### 1.4 Foundation
- [ ] Decide local-first vs. backend-first timing (see open questions)
- [ ] Real Settings page: currency, theme, Dexie export/import

## Phase 2 — Analytics

Goal: deepen Finance/Investment analytics, add Trading, ship real Reports.

### 2.1 Trading (foundation built — see current state above)
- [x] Foundation — full trade data model, Trading Journal CRUD, Trading Dashboard with computed stats
- [ ] Trade Analytics (deeper: expectancy, avg holding time, avg winner/loser, monthly/yearly return, strategy comparison — beyond the dashboard's current win rate/profit factor/RR/drawdown)
- [ ] Risk Management config (max daily/weekly loss limits, alerts when approached)
- [ ] Strategy Library (named strategies with entry/exit/risk rules, checklists — journal's `strategy` field is currently free text)
- [ ] Playbook (best/worst trades curation, lessons aggregation)
- [ ] Trade Replay
- [ ] Search/Filter/Sort polish on the Journal (currently just a table; blueprint wants symbol/market/date/strategy/emotion/tags/RR/profit/loss search + win/loss/breakeven/long/short/strategy/session/emotion filters)
- [ ] Company Analyzer
- [ ] Watchlist
- [ ] Economic Calendar
- [ ] AI News — needs external data + LLM, pulls AI infra forward from Phase 3
- [ ] AI Trade Coach — same, journal already captures the metadata (psychology, mistakes, lessons) it would need

### 2.2 Reports (full module)
- [ ] Daily/Weekly/Monthly report generation
- [ ] PDF/Excel/CSV export

### 2.3 Smart Scheduler (Productivity)

### 2.4 Backend milestone
- [ ] Stand up NestJS + PostgreSQL + Prisma + Redis
- [ ] Design Dexie → PostgreSQL migration path (needed once Trading needs external/live data or multi-device sync matters)

## Phase 3 — AI

Goal: AI Center + Knowledge Base, layered on the data from Phases 1-2.

- [ ] AI Chat
- [ ] AI Financial Advisor (reads Finance + Investment data)
- [ ] AI Personal Coach (reads Productivity data)
- [ ] AI Daily Summary (Dashboard + Notification Center)
- [ ] Knowledge Base: Documents, OCR, Semantic Search (Qdrant + RAG + LangChain)
- [ ] Move AI News / AI Trade Coach (built early in Phase 2) onto this shared AI infra

## Phase 4 — Mobile & Automation

- [ ] Notification Center: mobile push (FCM/APNs/Web Push), calendar reminders, price alerts, habit reminders, AI recommendations
- [ ] Automation: IF/THEN workflows, daily reports, trading alerts
- [ ] Security: Password Vault, 2FA, Encryption, Login History
- [ ] Backup: Local, Cloud, Version History
- [ ] Mobile app / PWA packaging
- [ ] Deployment pipeline: Docker, GitHub Actions, Nginx

## Open questions

- **Local-first vs. backend-first:** how long does Dexie/IndexedDB carry the app before NestJS + PostgreSQL is worth standing up? Recommendation above is to defer until Trading/AI/Notifications need server-side infra in Phase 2-3, but confirm — starting the backend earlier changes how Phase 1 modules should be built (API-shaped from day one vs. store-shaped).
- **Financial Goals vs. Goal Management:** resolved for now — built once under Finance (`src/features/finance/pages/Goals.tsx`) as `Goal`. Revisit if/when Productivity's Goal Management is built — reuse this model or keep them distinct?
- **Auth/multi-user:** single-user only, or multi-user with accounts from the start? Affects when the backend becomes mandatory rather than optional.
- **Nexus Finance PRD infrastructure gap:** a later PRD (OCR receipt scanning, real Authentication with Google/Apple/JWT, a conversational LLM-backed AI Assistant, Android/iOS) assumes backend + auth + AI-API infrastructure that doesn't exist yet. The local-only-computable slice of that PRD (Rule/Learning Engine, rule-based analytics, Budget, Goals) is built — see 1.1 above. Still open: which auth provider/backend to stand up, OCR approach (cloud API vs. client-side Tesseract.js), and how to proxy LLM calls without exposing API keys client-side, before the remaining PRD items are buildable.
