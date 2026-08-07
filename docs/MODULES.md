# Modules

**Last Updated:** 2026-08-02

## Overview

Every domain lives in `src/features/<name>/` with the same internal shape (see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)). This document covers all 15 feature-module folders that exist in the repo today, in the order they appear in the codebase. AI Analytics is summarized here and documented in full depth in [AI_ANALYTICS.md](AI_ANALYTICS.md); shared UI is documented in [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md).

---

## 1. Dashboard (`src/features/dashboard/`)

**Purpose:** The home page — an aggregated at-a-glance preview pulling live data from every other module.

**Route:** `/` and `/dashboard`.

**Features:** all-time balance + period income/expense/savings with % change vs. previous period; a day/month/year period selector; cash-flow line chart and expense-by-category pie chart; a rule-based (non-LLM) daily summary panel; up to 6 cross-module preview panels (Budget, Habit, Portfolio, Schedule, Todo, Trading), each linking into its own module; recent transactions list.

**Components:** `AiDailySummaryPanel`, `BudgetPreviewPanel`, `CashFlowSection`, `DashboardHeader`, `DashboardPeriodSelector`, `HabitPreviewPanel`, `PortfolioOverviewPanel`, `RecentTransactionsList`, `SchedulePreviewPanel`, `SummaryCardsGrid`, `TodoPreviewPanel`, `TradingOverviewPanel`, `charts/CashFlowLineChart`, `charts/ExpensePieChart`.

**Services:** none — reads other modules' stores directly (dashboard is a pure aggregation layer, owns no entity of its own).

**Stores:** `dashboardPeriodStore` (own, UI-only: selected granularity). Reads: `transactionStore`, `budgetStore`, `categoryStore`, `tradeStore`, `todoStore`, `habitStore`, `holdingStore`, `scheduleItemStore`.

**Database usage:** none directly — all reads flow through other modules' stores/services/repositories.

**Dependencies:** finance, trading, portfolio, todo, habits, schedule (read-only, for preview data).

**Current Status:** Fully implemented.

**Future Plans:** None documented beyond what's built.

---

## 2. Finance — core (`src/features/finance/`, excluding `aiAnalytics/`)

**Purpose:** The core money-tracking module — transactions, accounts, categories, budgets, savings goals, recipient/merchant auto-categorization, receipt-slip OCR.

**Routes:** `/finance`, `/transactions`, `/favorites`, `/budget`, `/goals`, `/accounts`, `/categories`, `/recipients`.

**Features:** 5 transaction types (income/expense/transfer/refund/adjustment) with tags/attachment/time/status/recurring/recipient metadata; account & category CRUD with in-use delete guards and duplicate-merge; recurring budgets with live spend-vs-limit progress; savings goals with milestone events (25/50/75/100% crossing log); a Learning Engine that auto-suggests a category from a transaction's recipient (confidence grows toward 100% with repeated use) or falls back to a seeded merchant lookup by title match; duplicate transaction/account/category detection and merge; Thai+English on-device OCR for receipt slips (Tesseract.js) with regex-based amount/date/recipient parsing, always pre-filling an editable form; CSV/PDF/JSON export, CSV import with per-row validation preview.

**Components:** `AccountForm`/`AccountTable`, `BudgetForm`/`BudgetTable`, `CategoryForm`/`CategoryTable`, `GoalCard`/`GoalForm`/`GoalsPreviewPanel`, `InsightsPanel`, `MergeAccountForm`/`MergeCategoryForm`, `MonthlyOverviewPanel`, `QuickAddGrid`, `RecipientProfileTable`/`RecipientSuggestionField`, `RecurringField`, `SlipScanner`, `SubscriptionsSummaryPanel`, `TransactionDrawer`/`TransactionForm`/`TransactionMetaFields`/`TransactionTable`/`TransactionTemplateForm`/`TransactionToolbar`.

**Services:** `transactionService`, `budgetService`, `goalService`, `transactionTemplateService` (generic `createCrudService`); `accountService` (hand-written — delete guard + merge); `categoryService` (hand-written — delete guard + merge); `recipientProfileService` (hand-written — the Learning Engine's write side, `recordUsage()` upserts confidence-scored profiles); `categorySuggestionService` (the Learning Engine's read side — recipient profile first, merchant-table fallback); `goalMilestoneService` (tier-crossing detection, write-path-only) + `goalMilestoneEventService` (thin CRUD wrapper the former calls into).

**Stores:** `accountStore`, `budgetStore`, `categoryStore`, `goalStore`, `goalMilestoneEventStore`, `recipientProfileStore`, `transactionStore`, `transactionTemplateStore` (all fetch-on-mount caches), `uiStore` (UI-only — transaction drawer open/draft state).

**Database usage:** `transactions`, `accounts`, `categories`, `budgets`, `goals`, `goalMilestoneEvents`, `recipientProfiles`, `merchants` (read-only reference table, no repository mutations), `transactionTemplates`.

**Dependencies:** `src/features/finance/aiAnalytics/` reads this module's stores/analyzers as its primary data source. `src/features/reminders/` is not used here (finance has no reminder integration).

**Current Status:** Fully implemented — every page has real forms (React Hook Form + Zod) and Dexie-backed CRUD.

**Future Plans:** See [ROADMAP.md](ROADMAP.md) — Net Worth tracking and a dedicated Subscription Manager (as first-class entities, beyond the existing duplicate-subscription detection) are explicitly not started.

---

## 3. Finance — AI Analytics (`src/features/finance/aiAnalytics/`)

**Purpose:** A local, rule-based financial intelligence engine — no LLM, no network calls. Full architecture in [AI_ANALYTICS.md](AI_ANALYTICS.md).

**Route:** `/ai-analytics`.

**Features (summary — see AI_ANALYTICS.md for depth):** a weighted, explainable Financial Health Score (7 sub-scores); a ~46-rule Rule Engine; a Behavior Analysis engine (9 detectors + 8 domain analyzers + spending-style classification); a Forecast engine (linear projection + an interactive What-If scenario simulator); a Recommendation engine (enriches rule findings with difficulty/timeline/impact estimates); an Executive Summary report aggregating every other engine; a keyword-classified AI Coach Q&A over 16 intents; category-detail drill-down; a financial timeline.

**Components:** ~50 components across `aiCoach/`, `behaviorAnalysis/`, `behaviorProfile/`, `categoryDetail/`, `executiveSummary/`, `financialHealthScore/`, `forecast/`, `merchantAnalysis/`, `spendingAnalysis/`, plus 7 top-level section components — all listed in [PROJECT_TREE.md](PROJECT_TREE.md).

**Services:** none — this module has no `services/`/`repositories/` of its own; it is a pure read-side computation layer over the core finance module's already-loaded store data, invoked through `hooks/useFinancialAnalysis.ts`.

**Stores:** none of its own — reads `transactionStore`, `budgetStore`, `categoryStore`, `goalStore`, `recipientProfileStore`, `goalMilestoneEventStore` from the core finance module.

**Database usage:** none directly.

**Dependencies:** finance (core) for all input data. `src/ai/` (the AI Gateway) is explicitly **not** a dependency — see [AI_ANALYTICS.md](AI_ANALYTICS.md).

**Current Status:** Fully implemented and the most extensive module in the codebase (~250 files).

**Future Plans:** A real LLM integration via `src/ai/`, if ever pursued, would sit alongside — not replace — this deterministic engine (see [DECISIONS.md](DECISIONS.md)).

---

## 4. Trading (`src/features/trading/`)

**Purpose:** A trading journal and performance-analytics dashboard.

**Routes:** `/trading` (dashboard), `/trading/journal`.

**Features:** full trade CRUD (symbol, market, direction, entry/exit, stop-loss/take-profit, quantity, commission/swap/slippage, strategy/setup/session, before/after psychology fields, mistakes/lessons, notes, screenshots, tags); win rate, profit factor, average RR, max drawdown, today/weekly/monthly P/L; equity curve, drawdown %, daily P/L, and a 6-bucket realized R-multiple risk-distribution chart; per-session (Asian/London/New York/Sydney/overlap) stats; best/worst strategy by cumulative P/L; a performance calendar; heuristic (pattern-matching, not AI) market-type auto-detection from a symbol; CSV export; search/filter by symbol, strategy, direction, result.

**Components:** `DailyPnlChart`, `DrawdownChart`, `EquityCurveChart`, `PerformanceCalendar`, `RiskDistributionChart`, `SessionAnalysisPanel`, `StrategyInsights`, `TradeCoreFields`/`TradeDrawer`/`TradeForm`/`TradeHistoryTable`/`TradeMetaFields`/`TradePsychologyFields`/`TradeRiskCalculator`/`TradeRiskFields`/`TradeTable`, `TradingQuickActions`, `TradingSummaryGrid`, `TradingToolbar`.

**Services:** `tradeService` (generic `createCrudService`).

**Stores:** `tradeStore` (fetch-on-mount cache; awards XP on trade close via `gamificationStore`), `tradingUIStore` (UI-only — trade drawer state).

**Database usage:** `trades`.

**Dependencies:** none on other feature modules; `dashboard/` and `src/hooks/useGlobalSearch.ts` read this module's store.

**Current Status:** Fully implemented.

**Future Plans:** Per [ROADMAP.md](ROADMAP.md) — deeper trade analytics (expectancy, avg holding time, strategy comparison), risk-management config with alerts, a named Strategy Library, a Playbook, Trade Replay, Watchlist, Economic Calendar, and AI News/AI Trade Coach are all **not started**.

---

## 5. Portfolio (`src/features/portfolio/`)

**Purpose:** A manual buy-and-hold investment tracker — no live price feed, user enters current price manually.

**Route:** `/trading/portfolio`.

**Features:** holding CRUD (symbol, market, quantity, average cost price, current price + last-updated timestamp, notes); cost basis, current value, unrealized P/L and P/L% (percent computed only against priced holdings, so a partially-priced portfolio doesn't understate its P/L%).

**Components:** `HoldingCard`, `HoldingForm`, `PortfolioSummaryGrid`.

**Services:** `holdingService` (generic `createCrudService`).

**Stores:** `holdingStore` (fetch-on-mount cache; `updateCurrentPrice` is a direct set, not additive).

**Database usage:** `holdings`.

**Dependencies:** none; `dashboard/PortfolioOverviewPanel` reads this module's store.

**Current Status:** Fully implemented.

**Future Plans:** No live pricing integration; asset allocation breakdown, DCA planner, dividend tracker, and rebalancing suggestions are per [ROADMAP.md](ROADMAP.md) **not started**.

---

## 6. Todo (`src/features/todo/`)

**Purpose:** A simple task list with priority and due dates.

**Route:** `/todo`.

**Features:** title/notes/due date/priority (low/medium/high), completion toggle (awards priority-scaled XP only on the completing transition), search + status + priority filters (in-memory, no dedicated Dexie index for these fields).

**Components:** `TodoForm`, `TodoItem`, `TodoList`, `TodoToolbar`.

**Services:** `todoService` (generic `createCrudService`).

**Stores:** `todoStore` (fetch-on-mount cache).

**Database usage:** `todos`.

**Dependencies:** none; `dashboard/TodoPreviewPanel` reads this module's store.

**Current Status:** Fully implemented.

**Future Plans:** None documented.

---

## 7. Habits (`src/features/habits/`)

**Purpose:** A habit tracker with daily/weekly frequency, streak counting, and optional native reminders.

**Route:** `/habits`.

**Features:** habit CRUD with daily/weekly frequency; streak calculation with a grace period (a streak doesn't show as broken before today's/this-week's check-in happens); idempotent daily check-in (awards XP); a 14-dot recent-history strip; optional native reminder (time + daily/weekly-with-weekdays repeat) scheduled/cancelled automatically on create/update/delete.

**Components:** `HabitCard`, `HabitForm`, `HabitReminderField`.

**Services:** `habitService` (generic `createCrudService`).

**Stores:** `habitStore` (fetch-on-mount cache; calls `reminders/services/nativeReminderService` on add/update/delete; `checkIn` is idempotent per day).

**Database usage:** `habits`.

**Dependencies:** `src/features/reminders/` (native notification scheduling).

**Current Status:** Fully implemented.

**Future Plans:** None documented.

---

## 8. Schedule — "Life Schedule" (`src/features/schedule/`)

**Purpose:** A recurring daily-routine timeline (e.g. "Gym," "Work," "Sleep"), the successor to the retired Calendar feature (see module 9 below).

**Route:** `/schedule`.

**Features:** always-recurring items (daily or specific-weekdays) with start/optional-end time, icon/color, enable/disable without delete; drag-to-reorder that actually re-derives a new start time from the dragged item's neighbors (display order is always chronological, so dragging means "retiming," not reordering); a live "current activity" card with elapsed-time progress bar and a "next activity" line, ticking every 30s; optional native reminder offset (0/5/10/15/30 min before the item's own occurrence).

**Components:** `CurrentActivityCard`, `NextActivityLine`, `ScheduleItemCard`, `ScheduleItemForm`, `ScheduleTimeline`, `WeekdayRepeatField`.

**Services:** `scheduleItemService` (generic `createCrudService`).

**Stores:** `scheduleItemStore` (fetch-on-mount cache; manages native reminders identically to `habitStore`).

**Database usage:** `scheduleItems`.

**Dependencies:** `src/features/reminders/` (native notification scheduling).

**Current Status:** Fully implemented.

**Future Plans:** None documented.

---

## 9. Calendar (`src/features/calendar/`) — orphaned

**Purpose:** None — **this module has no active feature code.** It contains exactly one file, `types/index.ts`, which its own header comment explains: the Calendar feature's UI (pages, components, store, service, repository, schema, recurrence utils) was retired in favor of Life Schedule, but the `CalendarEvent` type and the `calendarEvents` Dexie table are deliberately kept — not deleted — so that any pre-existing user data in that table is never destroyed, and `db.ts`'s schema declaration still type-checks.

**Route:** none.

**Components / Services / Stores:** none.

**Database usage:** `calendarEvents` (declared, still synced/backed-up generically, never read or written by any feature code).

**Dependencies:** none — confirmed via grep, only generic schema-agnostic infrastructure (sync, backup, encryption migration) references `calendarEvents` at all, and only because those enumerate every table name mechanically.

**Current Status:** Dead/orphaned by design — see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

**Future Plans:** Delete once no user's `calendarEvents` data still needs preserving.

---

## 10. Reminders (`src/features/reminders/`)

**Purpose:** Shared native local-notification infrastructure — not a page, a service consumed by other modules.

**Route:** none (no `pages/` — UI-less).

**Features:** schedules Capacitor local notifications on a dedicated Android channel; fans a weekly multi-weekday repeat rule out into one native notification per weekday (the plugin supports only one weekday per scheduled id); a collision-free id scheme (`namespace × 100_000_000 + entityId × 10 + weekday`) so Habit and Schedule reminders — independent Dexie auto-increment ids — never clobber each other; no-ops entirely on web (no permission prompts during dev/e2e, and a web notification wouldn't survive tab close anyway).

**Components:** `WeekdayPicker` (shared 7-day toggle row).

**Services:** `nativeReminderService` (`scheduleReminder`, `cancelReminder`).

**Stores:** none.

**Database usage:** none — reminders are derived from Habit/Schedule entity fields at write time, not persisted as their own entity.

**Dependencies/Dependents:** consumed only by `habits/` and `schedule/` (confirmed via grep — no other module imports it).

**Current Status:** Fully implemented as infrastructure.

**Future Plans:** None documented; would be the natural place to add push notifications (FCM/APNs/Web Push) per [ROADMAP.md](ROADMAP.md)'s Phase 4, currently **not started**.

---

## 11. Sync (`src/features/sync/`)

**Purpose:** Optional, opt-in multi-device data relay against Supabase. Full detail in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) and [SECURITY.md](SECURITY.md).

**Route:** none (no dedicated page — surfaced via `SyncSettings.tsx` and the sign-in gate wrapping the whole app).

**Features:** email/password sign-up/sign-in (no OAuth, no magic link); a generic push/pull sync engine against one Supabase table (`synced_records`) covering 14 of the app's tables (`merchants` excluded — seed data, not personal); tombstone-based deletion propagation; last-write-wins conflict resolution on a client-embedded timestamp; a malformed-row structural guard on pull; periodic (5s) + `online`-event-triggered sync; graceful no-auth-screen fallback when Supabase env vars are absent, so the app never locks a user out with no configured way in.

**Components:** `AuthGate` (top-level gate), `LoginScreen`, `SyncProvider` (side-effect-only mount).

**Services:** none — `syncEngine.ts`/`tombstones.ts` are free functions, not a service-layer wrapper.

**Stores:** `authStore` (Supabase session + sync status — not an entity cache, wraps the Supabase Auth SDK directly).

**Database usage:** reads/writes all 14 synced tables generically, plus `syncTombstones` and `syncState` (sync cursor bookkeeping).

**Dependencies:** every entity-owning module (generic, via table name) for what it syncs; `src/features/encryption/` for whether payloads are encrypted before sync.

**Current Status:** Fully implemented, fully optional (the app is 100% functional with sync unconfigured).

**Future Plans:** None documented — no server-side business logic is planned; Supabase remains a relay only.

---

## 12. Encryption (`src/features/encryption/`)

**Purpose:** Optional client-side encryption-at-rest for synced data. Full detail in [SECURITY.md](SECURITY.md).

**Route:** none (surfaced via `EncryptionSettings.tsx`).

**Features:** AES-GCM 256-bit encryption of every synced row's business fields into one opaque `encryptedContent` blob (two fields — `recipientProfiles.recipientKey`, `budgets.category` — stay plaintext to preserve their unique-index lookups); a per-user Data Encryption Key (DEK) generated once, held only in memory at runtime; PBKDF2 (600,000 iterations) key derivation from either the device PIN (day-to-day unlock) or the user's Supabase account password (recovery escrow); a full migration flow (`enableEncryption`) that downloads a plaintext backup first, then re-encrypts every row in chunked batches with resumability; a "re-escrow" repair flow for a broken/wrong escrow password; an account-password-based recovery flow for a device that's lost its local PIN; a "catch-up" detector for a device that pulled already-encrypted rows from another device before ever enabling encryption itself.

**Components:** `EnableEncryptionForm`, `EncryptionRecoveryFlow`, `ReescrowDekForm`.

**Services:** none as a service layer — `crypto/encryption.ts` (WebCrypto primitives), `migration/enableEncryption.ts`, `migration/reescrowDek.ts`, `recovery/recoverDekFromEscrow.ts`, `catchUp.ts` are all free functions.

**Stores:** `encryptionSessionStore` (in-memory DEK only, deliberately never persisted).

**Database usage:** reads/rewrites all 14 synced tables during migration; the encryption wrapper itself (`src/database/encryptedRepository.ts`) sits underneath every repository, not owned by this module.

**Dependencies:** `src/features/sync/` (account-password escrow requires a signed-in Supabase user), `src/features/lock/` (the DEK is wrapped under the app-lock PIN for day-to-day unlock).

**Current Status:** Implemented for enable/escrow/recover. **No "disable encryption" flow exists** — explicitly blocked in `appLockStore.ts` pending that flow being built (see [SECURITY.md](SECURITY.md), [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).

**Future Plans:** A disable-encryption flow.

---

## 13. Lock (`src/features/lock/`)

**Purpose:** Device-local App Lock — a PIN privacy screen (not real authentication), optionally biometric-backed, and the mechanism that unlocks the encryption DEK.

**Route:** none (composes around the whole app in `App.tsx`, surfaced via `SecuritySettings.tsx`).

**Features:** PIN setup/unlock/change; "remember me" (7-day skip); auto-lock after an idle timeout (never/5/15/30/60 min), tracked via mouse/keyboard/touch activity listeners; biometric unlock on native platforms (hardware-backed Keystore credential, gated on "strong" biometry only); "Forgot PIN" recovery via the encryption module's account-password escrow, shown only when sync is configured and encryption is enabled.

**Components:** `AppLockGate` (the composing gate), `AppLockScreen`, `ChangePinForm`, `DisableLockForm`, `EnableBiometricForm`.

**Services:** `biometricService` (Capacitor-native only, no-ops on web).

**Stores:** none of its own — reads/writes the global `appLockStore` (`src/store/appLockStore.ts`).

**Database usage:** none — all lock/PIN state lives in `localStorage`/`sessionStorage` via the Zustand `persist` middleware, not Dexie.

**Dependencies:** `src/features/encryption/` (unlocking with the PIN also unwraps the session DEK when encryption is enabled).

**Current Status:** Fully implemented, explicitly **not** a real authentication system — see [SECURITY.md](SECURITY.md) for the documented threat-model distinction between the PIN hash (unstretched SHA-256) and the DEK's own key derivation (PBKDF2, 600k iterations).

**Future Plans:** None documented.

---

## Shared / cross-cutting (not `features/`)

Briefly, since these support every module above rather than owning a domain: `src/components/` (shared UI, see [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md)), `src/database/` (Dexie + factories, see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)), `src/store/` (global stores, see [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)), `src/layouts/` + `src/router/` (see [ROUTING.md](ROUTING.md)), `src/i18n/` (Thai/English translation dictionary), `src/ai/` (the parked AI Gateway, see [AI_ANALYTICS.md](AI_ANALYTICS.md)), `src/lib/` (Supabase + Sentry client setup, see [DEPLOYMENT.md](DEPLOYMENT.md)).

## Current Status

15 feature modules exist; 14 are actively developed and fully implemented for their current scope, 1 (`calendar/`) is intentionally orphaned/dead. See each module section above for specifics.

## Future Improvements

See [ROADMAP.md](ROADMAP.md) for the consolidated Planned/Future list across all modules.
