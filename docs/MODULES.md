# Modules

**Last Updated:** 2026-08-19

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

**Purpose:** The core money-tracking module — transactions, accounts, categories, budgets, savings goals, recipient/merchant auto-categorization, receipt-slip OCR, and the Gallery Slip Scanner.

**Routes:** `/finance`, `/transactions`, `/favorites`, `/budget`, `/goals`, `/accounts`, `/net-worth`, `/subscriptions`, `/categories`, `/recipients`.

**Features:** 5 transaction types (income/expense/transfer/refund/adjustment) with tags/attachment/time/status/recurring/recipient metadata; account & category CRUD with in-use delete guards and duplicate-merge; recurring budgets with live spend-vs-limit progress; savings goals with milestone events (25/50/75/100% crossing log); manually-tracked **Net Worth** (see below) — assets/liabilities and a daily history trend; a first-class **Subscription Manager** (see below) — independently-tracked recurring payments with status/billing-frequency/next-billing-date, distinct from the read-only subscription *detectors*; a Learning Engine that auto-suggests a category from a transaction's recipient (confidence grows toward 100% with repeated use) or falls back to a seeded merchant lookup by title match; duplicate transaction detection; duplicate account/category detection and merge, both manually (`MergeAccountForm`/`MergeCategoryForm` on the Accounts/Categories pages) and now automatically — `src/features/sync/syncEngine.ts` calls `dedupeAccountsAndCategories()` after every pull to fold name-duplicate accounts/categories created independently on two devices before they ever synced (see section 11); Thai+English on-device OCR for receipt slips (Tesseract.js) with regex-based amount/date/recipient parsing, always pre-filling an editable form; a batch **Gallery Slip Scanner** (see below) for importing many slips at once straight into transactions; a **Payment Notification Capture** (see below) for one-tap import straight from a bank app's own payment notification; CSV/PDF/JSON export, CSV import with per-row validation preview.

**Components:** `AccountForm`/`AccountTable`, `BudgetForm`/`BudgetTable`, `BudgetHistoryTable`, `CategoryForm`/`CategoryTable`, `GoalCard`/`GoalForm`/`GoalsPreviewPanel`, `InsightsPanel`, `MergeAccountForm`/`MergeCategoryForm`, `MonthlyOverviewPanel`, `NetWorthItemForm`/`NetWorthItemSection`/`NetWorthSummaryGrid`/`NetWorthHistoryChart`, `QuickAddGrid`, `RecipientProfileTable`/`RecipientSuggestionField`, `RecurringField`, `SlipScanner` (single-slip manual scan), `SubscriptionCard`/`SubscriptionForm`/`SubscriptionSummaryGrid`, `SubscriptionDueCheck` (mounted app-wide in `MainLayout.tsx`, renders nothing — the automatic transaction-generation check), `SubscriptionsSummaryPanel` (the pre-existing detector's dashboard panel — distinct from the Subscription Manager components above), `TransactionDrawer`/`TransactionForm`/`TransactionMetaFields`/`TransactionTable`/`TransactionTemplateForm`/`TransactionToolbar`.

**Services:** `transactionService`, `budgetService`, `goalService`, `transactionTemplateService`, `netWorthItemService`, `netWorthSnapshotService`, `subscriptionService`, `budgetPeriodSnapshotService` (generic `createCrudService`); `accountService` (hand-written — delete guard + merge); `categoryService` (hand-written — delete guard + merge); `recipientProfileService` (hand-written — the Learning Engine's write side, `recordUsage()` upserts confidence-scored profiles); `categorySuggestionService` (the Learning Engine's read side — recipient profile first, merchant-table fallback); `goalMilestoneService` (tier-crossing detection, write-path-only) + `goalMilestoneEventService` (thin CRUD wrapper the former calls into); `netWorthTrackingService` (hand-written — upserts today's `NetWorthSnapshot` whenever an item add/update/delete changes the totals, the same "log what happened" role `goalMilestoneService` plays for goals); `budgetTrackingService` (hand-written — upserts the current period's `BudgetPeriodSnapshot` and fires an escalation toast, run from `Budget.tsx`'s own effect rather than a store action); `subscriptionTransactionService` (hand-written — the foreground due-check that generates transactions from due subscriptions).

**Stores:** `accountStore`, `budgetStore`, `budgetPeriodSnapshotStore` (read-only), `categoryStore`, `goalStore`, `goalMilestoneEventStore`, `netWorthItemStore`, `netWorthSnapshotStore`, `subscriptionStore`, `recipientProfileStore`, `transactionStore`, `transactionTemplateStore` (all fetch-on-mount caches), `uiStore` (UI-only — transaction drawer open/draft state).

**Database usage:** `transactions`, `accounts`, `categories`, `budgets`, `budgetPeriodSnapshots`, `goals`, `goalMilestoneEvents`, `netWorthItems`, `netWorthSnapshots`, `subscriptions`, `recipientProfiles`, `merchants` (read-only reference table, no repository mutations), `transactionTemplates`.

**Dependencies:** `src/features/finance/aiAnalytics/` reads this module's stores/analyzers as its primary data source. `src/features/reminders/` is used by `subscriptionStore.ts` (an opt-in, one-off reminder before a bill is due) — Finance's first reminder integration; see the Subscription Manager entry below.

**Current Status:** Fully implemented — every page has real forms (React Hook Form + Zod) and Dexie-backed CRUD.

**Future Plans:** See [ROADMAP.md](ROADMAP.md) for what remains in the Finance epic (Budget Improvements, FIN-001).

### Gallery Slip Scanner (`src/features/finance/slipScanner/`)

A separate, ~100-file subsystem within Finance for **batch** slip import — distinct from the single-slip `SlipScanner` component above. A "Scan Gallery" button on the Transactions page (`GalleryScanFlow`) drives: bank selection → image picker (web file input, or `@capacitor/camera` `pickImages` on Android) → extraction → Import Preview → Smart Import.

**Extraction pipeline** (`extractSlipCandidate`): QR detect (jsQR, with a rotate/brighten/contrast/upscale recovery retry) → EMVCo/PromptPay TLV parse (with CRC-16 integrity) → plugin-based bank identification (falls back to OCR-text bank identification when EMVCo can't resolve it) → OCR fallback (Tesseract.js, reused from the single-slip scanner) when the QR is missing/damaged/non-EMVCo — adaptively brightness/contrast-corrected then upscaled/downscaled + Otsu-binarised to beat slip watermarks — → slip-level duplicate detection (SHA-256 + perceptual hash).

**Also includes:** a versioned scan cache and concurrent, byte-budgeted queue (`ScanCache`/`MediaProvider`, `scanSessionService`) built for a 50k-image library, now driving real extraction (`slipExtractionProcessor`) behind `useFullGalleryScan`/`FullGalleryScanPanel` — a live progress dashboard with pause/resume/cancel, tested but not yet wired into navigation; Smart Import with progress/cancel/resume/rollback into the existing `transactionService`, plus conflict resolution against existing transactions; security (audit log, secure deletion, CRC tamper detection); a deterministic, advisory (never-mutating) AI layer — slip verification, fraud detection, transaction categorization with local learning (now with a Review Queue UI to correct a guess and have it stick), merchant intelligence, transaction linking, spending intelligence, a financial intelligence report.

**Two scan paths coexist by design:** the shipping picker flow (`GalleryScanFlow`/`useSlipScan`, sequential, same-batch near-duplicate detection) and the concurrent orchestrator path (`FullGalleryScanPanel`/`useFullGalleryScan`, built for a full native-gallery scan) — the latter intentionally skips same-batch dedup, since that logic depends on a processing order the concurrent queue doesn't guarantee. See [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

**Current Status:** Complete (GS epic 50/50) and verified on-device (Android APK installed and tested against real slips, with two follow-up bug-fix/code-review rounds — see [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md)'s "Post-Launch Stabilization"). The 2026-08-15 Slip Intelligence Phases 1-9 closed the confidence-engine, smart-duplicate, conflict-resolver, recovery-system, and category-learning-UI gaps, added a confidence-tier import policy and an Import History screen, and implemented the native `GalleryMediaPlugin.java` MediaStore plugin (compiles, packages; not yet device-validated). Known gaps: the native plugin needs an on-device pass, and `FullGalleryScanPanel` has no nav entry point yet — see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

**Future Plans:** Device-validate the native plugin, then wire `FullGalleryScanPanel` into live navigation (likely alongside or replacing the picker button); a deterministic same-batch dedup pass for the orchestrator path. See [ROADMAP.md](ROADMAP.md) and [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md) for full detail (this module has no dedicated architecture doc the way AI Analytics does — the task registry's per-task notes serve that role).

### Payment Notification Capture (`src/features/finance/notificationCapture/`)

Phase 1: reads payment-confirmation notifications from recognized Thai banking apps — SCB Easy, K PLUS, Krungthai NEXT, เป๋าตัง (Pao Tang) — via an always-on native `PaymentNotificationListenerService.java`, and surfaces a one-tap confirm sheet instead of writing a transaction automatically. Shares the `SlipCandidate` model and the Smart Import pipeline with the Gallery Slip Scanner rather than being a separate write path.

**How it works:** `bankPackageRegistry.ts` maps a notification's Android package name to the same bank ids used everywhere else in the slip scanner (a flat, exact lookup — package name is a reliable signal, unlike OCR-text bank matching) for `com.scb.phone`, `com.kasikorn.retail.mbanking.wap`, `ktbcs.netbank`, and `com.ktb.customer.qr`. `notificationTextParser.ts` extracts only amount and counterparty from the notification's title/text/bigText — a currency-anchored regex for amount (more conservative than the slip OCR parser: no bare-decimal fallback, since a 1-2 line notification has far less context to disambiguate a stray number), and a marker-based match (`ไปยัง`/`ให้กับ`/`ให้`/`to`) for counterparty. `buildNotificationCandidate.ts` turns a raw stashed notification into a `SlipCandidate` (bankId/confidence 90 when the package resolves a bank, 70 otherwise), returning `null` (and dropping the candidate) when no amount could be parsed, since an amountless candidate can never import anyway. `pendingNotificationCandidateStore.ts` re-reads whatever the native side has stashed, and `usePendingNotificationCandidates.ts` refreshes on mount and on every app resume (a "warm" tap while the app is already backgrounded doesn't remount anything). `PendingPaymentSheet.tsx` — mounted once at `MainLayout.tsx`, alongside `ScanRecoveryNotice` — shows the oldest pending candidate, lets the user edit the name, pick income/expense type, and pick a category (chips filter to whichever type is currently selected, defaulting to a keyword-categorizer guess for expense only), then a single explicit "Confirm" tap calls `useSmartImport().importCandidates(...)` — the same pipeline every other import path uses — before acknowledging (clearing) the candidate natively. "Dismiss" acknowledges without importing. Native code structurally cannot reach Dexie itself — `PaymentNotificationCapturePlugin.java` only lets JS check/open the OS's special "Notification access" grant (no in-app request dialog exists for this permission category), flip an independent in-app capture toggle, and read/clear stashed notifications; the actual write only ever happens from the user's explicit tap.

**Settings:** `NotificationCaptureSettings.tsx` — native-only (renders nothing on web), shows an "open Notification access settings" button when the OS grant is missing, else an in-app enable/disable toggle.

**Current Status:** Phase 1 shipped for SCB, K PLUS, Krungthai NEXT, เป๋าตัง. Real bank notification text formats were unverified at time of writing for some banks; SCB Easy and K PLUS package names are confirmed against a real device, K PLUS additionally end-to-end with a real payment; Krungthai NEXT and เป๋าตัง confirmed via `aapt2 dump badging` against the installed APKs.

**Future Plans:** On-device verification of the remaining banks' notification text patterns against `notificationTextParser.ts`'s regexes; more banks per [ROADMAP.md](ROADMAP.md)/[../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md).

### Net Worth (`src/features/finance/{repositories,services,store,schemas,utils,hooks,components,pages}/*NetWorth*`, FIN-002)

Manually-tracked assets and liabilities plus a daily net-worth history trend. Deliberately **not** auto-derived from `Account`/`Transaction` data — `Account` carries no balance field at all (just name/type/icon/color; nothing in this app computes a per-account balance anywhere), so there is no existing account balance to safely map onto an asset or liability. Modeled instead as its own manually-maintained entity, the same shape as Portfolio's `Holding` (a user-entered current value, no live price feed, no paid API).

**How it works:** one unified `NetWorthItem` model (`kind: "asset" | "liability"` discriminator, rather than two near-identical parallel verticals — the same call already made for Vault's password/note/recoveryKey shapes) with `{name, category, value, icon, color, note}`; `value` is always a non-negative magnitude, `kind` alone determines whether it adds to or subtracts from the total. `netWorthMath.ts`'s `calculateNetWorthTotals()` is a pure function summing `totalAssets`/`totalLiabilities`/`netWorth` from the item list, used both by `useNetWorthStats()` (the page's live summary) and `netWorthTrackingService.ts`'s `recordSnapshot()`. History is a `NetWorthSnapshot` log — one row per calendar day, upserted (not appended) whenever `netWorthItemStore`'s add/update/delete actions call `recordSnapshot()`, the same write-path role `goalMilestoneService.checkAndLogCrossings()` plays for `goalStore` — mirroring `GoalMilestoneEvent`'s own "log what already happened, no backfill" precedent: history starts from whenever this feature ships.

**UI:** `NetWorth.tsx` — a summary grid (total assets/liabilities/net worth), a Recharts line chart of the snapshot history (mirrors `CashFlowLineChart.tsx`; hidden until at least 2 days of history exist), and two grouped sections (Assets/Liabilities, each with its own subtotal) with edit/delete per item. `NetWorthItemForm.tsx` has an asset/liability toggle (mirrors Payment Notification Capture's income/expense toggle) that switches which category options and icon set are offered, resetting category/icon/color to that kind's defaults on switch.

**Non-goals, stated explicitly:** no live price feeds or paid APIs; no automatic linking to an `Account` record (there is no account balance to link *to*, per the architecture note above); no XP/gamification reward for adding an item (matches Account/Budget/Category's own precedent — only recurring activities grant XP in this app, not one-time setup entries).

**Current Status:** Complete. `tsc -b`/`oxlint`/full test suite/`npm run build` all clean; 27 new tests (calculation, schema validation, repository CRUD/encryption, snapshot upsert, store add/update/delete/persistence). **Not yet verified**: a live authenticated browser click-through — no device was connected and a fresh browser context has no session against this project's real Supabase backend, so the rendered page/kind-toggle/history chart were not visually confirmed on-screen. See [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md)'s FIN-002 entry.

### Subscription Manager (`src/features/finance/{repositories,services,store,schemas,utils,hooks,components,pages}/*Subscription*`, FIN-004)

An independently-managed recurring-payment entity — genuinely distinct from the two pre-existing subscription *detectors* already in this codebase (`useSubscriptions.ts`'s derived-from-latest-transaction summary, renamed to `DetectedSubscription` to avoid a naming collision with this new domain type; and `behaviorAnalysis.ts`'s pattern-matching `computeSubscriptions()`), neither of which has an independent lifecycle, a status, or notes — they only ever summarize what transaction history already implies.

**How it works:** one `Subscription` model — `{name, amount, billingFrequency, nextBillingDate, status, category?, account?, note?, icon, color, reminderEnabled?}` — where `billingFrequency` reuses the existing `RecurringFrequency` type (no new frequency enum) and `status` (`"active" | "paused" | "cancelled"`) is new, with no direct precedent elsewhere in the app. `nextBillingDate` is stored exactly as entered/edited and is **never silently rewritten by display logic**; `subscriptionMath.ts`'s `resolveNextBillingDate()` is a pure function that rolls it forward for *display only*, using `date-fns`'s calendar-aware `addDays/addWeeks/addMonths/addYears` (correctly handling edge cases like Jan 31 + 1 month → Feb 28). `calculateSubscriptionStats()` (also in `subscriptionMath.ts`) sums active-only monthly/yearly totals and per-status counts, feeding both `useSubscriptionStats()` (the page) and `SubscriptionSummaryGrid`.

**Automatic transaction generation** (`subscriptionTransactionService.ts`'s `generateDueTransactions()`): a foreground-only due-check — this app still has no background/cron mechanism, and none was introduced — mounted via a silent `SubscriptionDueCheck.tsx` in `MainLayout.tsx` (runs on mount and on native app resume, mirroring `usePendingNotificationCandidates.ts`'s exact pattern). For each `active` subscription with an `account` set and a due/overdue `nextBillingDate`, it creates a dated `Transaction` and immediately advances `nextBillingDate` by one cycle (via `subscriptionMath.ts`'s exported `advanceOneBillingCycle()`, the same single-step math `resolveNextBillingDate()` uses internally) as the direct, intended side effect of that specific write — `nextBillingDate` itself is the idempotency signal, no separate marker field needed. Loops for multiple missed cycles, capped at 12 per subscription. The generated transaction deliberately leaves `recurring` unset, since `useSubscriptions.ts`'s detector filters on that field — this keeps an auto-generated transaction from being double-counted by the old detector. One batched toast summarizes how many transactions were generated across how many subscriptions.

**Reminders**: an opt-in `reminderEnabled` toggle (default off, matching Habit's own opt-in field) fires once, a fixed day before `nextBillingDate` at 09:00 local — a stated simplification, no per-subscription time-of-day picker. Extends `src/features/reminders/` with a new one-off `{ frequency: "once"; at }` `RepeatRule` variant (Habit/ScheduleItem's own entity fields use a new, narrower `RecurringRepeatRule` alias so widening the shared type didn't loosen their daily/weekly-only contracts) and a `subscription: 3` `REMINDER_NAMESPACE` entry; wired into `subscriptionStore.ts`'s add/update/delete exactly like `habitStore.ts`'s own `reminderFor()`/cancel-then-reschedule pattern.

**UI:** `Subscriptions.tsx` mirrors `Goals.tsx`'s page shell (header+Add, error/loading/empty states, card grid, Drawer+Form); cards sort active-first (soonest `nextBillingDate` first), then paused, then cancelled. `SubscriptionCard.tsx` shows a status badge, a "due in N days"/"due today" line (active only), category/account, and the monthly-equivalent amount; edit/delete via icon buttons with no confirmation dialog, matching the existing convention (`AccountTable`/`GoalCard`/`NetWorthItemSection` — none of them use `window.confirm()` either). `SubscriptionForm.tsx` mirrors `AccountForm.tsx`, with `category` filtered to expense categories only, `account` populated from `useAccountStore`, and one reminder checkbox.

**Non-goals, stated explicitly:** no duplicate-name blocking (matches Account/Category/Goal/Holding/NetWorthItem's own precedent — same-name entries are already allowed everywhere else); no search/filter UI (matches `Goals.tsx`'s precedent at comparable list size); zero new icons (`SUBSCRIPTION_ICON_OPTIONS` is a curated subset of the pre-existing shared `ICONS` map).

**Current Status:** Complete, including the automatic transaction generation and reminders that shipped as a follow-up the same day. `tsc -b`/`oxlint`/full test suite/`npm run build` all clean; 40 tests from the original delivery plus 16 more from the follow-up (math/roll-forward/stats/advance-cycle/reminder-time calculation, schema validation, repository CRUD/encryption/tombstone, store add/update/status-transition/delete/reminder-wiring, due-transaction generation with capped catch-up). See [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md)'s FIN-004 entry for the manual-verification status.

### Budget (`src/features/finance/{repositories,services,store,components}/*BudgetPeriodSnapshot*`, `budgetTrackingService.ts`, FIN-001)

The core Budget feature (recurring, per-category, live progress) predates this entry — see the Finance module summary above. FIN-001 closed two bounded gaps: `computeBudgetSpend()` (`budgetStatus.ts`) only ever computes against a budget's *current* `amount` and the *current* period, so a past period's true performance becomes unrecoverable/wrong the moment the budget's amount is later edited — no historical record existed; and `status: "ok"|"near"|"over"` was computed but only ever shown visually, never as a notification.

**How it works:** `BudgetPeriodSnapshot` — `{budgetSyncId, category, period, periodStart, periodEnd, amount, spent, status}` — upserted by `(budgetSyncId, periodStart)`, mirroring `netWorthSnapshotRepository.ts`/`netWorthSnapshotService.ts`'s exact factory one-liner pattern (not a write-once log like `GoalMilestoneEvent`, since a period's spend can legitimately be recomputed many times before it ends; once a new period starts, the old row is never touched again). `budgetTrackingService.ts`'s `recordBudgetProgress()` runs from a `useEffect` in `Budget.tsx` whenever `useBudgetProgress()` recomputes — spend changes on any relevant transaction change, not just a budget mutation, so this couldn't hook into `budgetStore`'s own actions the way `netWorthTrackingService` hooks into `netWorthItemStore`'s. The stored `status` itself is the "already notified" guard: a genuine escalation (`ok→near`, `near→over`, or `ok→over`) fires exactly one `useToastStore` warning/error, downgrades never toast, and a brand-new row never toasts on its own first-ever record even if already over/near limit.

**UI:** `BudgetHistoryTable.tsx` — a plain table, not a Recharts chart, since the data is categorical per-period status rather than a continuous numeric series — lists past (non-current-period) snapshot rows below the existing `BudgetTable` on `Budget.tsx`.

**Current Status:** Complete, and verified live on a real device. `tsc -b`/`oxlint`/full test suite/`npm run build` all clean; 10 tests (`budgetTrackingService.test.ts` — upsert, skip-with-no-syncId, no-toast-on-first-record, escalation toasts, no-re-toast-unchanged, no-toast-on-downgrade, store refresh, concurrent-calls-don't-duplicate). `recordBudgetProgress()` is serialized through a module-level promise-chain queue — found necessary only through live testing: `Budget.tsx`'s mount fires the recording effect twice (once per settling async store load), and without serialization the second call could read the first call's not-yet-committed write and create a duplicate row instead of updating it. Confirmed live on-device: a fresh app process's first `/budget` visit now produces exactly one row per budget.

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

**Features:** schedules Capacitor local notifications on a dedicated Android channel; fans a weekly multi-weekday repeat rule out into one native notification per weekday (the plugin supports only one weekday per scheduled id); a one-off `{frequency: "once"; at}` schedule (the plugin's separate `at: Date` form, distinct from its repeating `on:{...}` form) for a reminder tied to a specific upcoming date rather than an indefinite daily/weekly pattern — used by Subscription reminders; a collision-free id scheme (`namespace × 100_000_000 + entityId × 10 + weekday`, weekday fixed at 0 for the one-off case) so Habit, Schedule, and Subscription reminders — independent Dexie auto-increment ids — never clobber each other; no-ops entirely on web (no permission prompts during dev/e2e, and a web notification wouldn't survive tab close anyway).

**Components:** `WeekdayPicker` (shared 7-day toggle row).

**Services:** `nativeReminderService` (`scheduleReminder`, `cancelReminder`).

**Stores:** none.

**Database usage:** none — reminders are derived from Habit/Schedule/Subscription entity fields at write time, not persisted as their own entity.

**Dependencies/Dependents:** consumed by `habits/`, `schedule/`, and `finance/` (`subscriptionStore.ts`, an opt-in one-off reminder before a bill is due) — confirmed via grep. `RepeatRule` (the full daily/weekly/once union) is the mechanism-level type `nativeReminderService`'s public API accepts; `Habit.reminderRepeat`/`ScheduleItem.repeat` use a narrower `RecurringRepeatRule` alias (daily/weekly only, matching what their own `repeatRuleSchema.ts` can actually produce) rather than the full union.

**Current Status:** Fully implemented as infrastructure.

**Future Plans:** None documented; would be the natural place to add push notifications (FCM/APNs/Web Push) per [ROADMAP.md](ROADMAP.md)'s Phase 4, currently **not started**.

---

## 11. Sync (`src/features/sync/`)

**Purpose:** Optional, opt-in multi-device data relay against Supabase. Full detail in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) and [SECURITY.md](SECURITY.md).

**Route:** none (no dedicated page — surfaced via `SyncSettings.tsx` and the sign-in gate wrapping the whole app).

**Features:** email/password sign-up/sign-in (no OAuth, no magic link); a generic push/pull sync engine against one Supabase table (`synced_records`) covering 17 of the app's tables (`merchants` excluded — seed data, not personal); tombstone-based deletion propagation; last-write-wins conflict resolution on a client-embedded timestamp; a malformed-row structural guard on pull; periodic (5s) + `online`-event-triggered sync; graceful no-auth-screen fallback when Supabase env vars are absent, so the app never locks a user out with no configured way in; a one-time, flag-gated self-healing migration (`repairStuckPushCursorsOnce()`) that clears every table's local push cursor to repair a since-fixed bug where an older build's pull-side cursor nudge could silently exclude an unpushed local row from every future sync pass — clearing a push cursor is always safe, since re-upserting an already-synced row is a harmless no-op.

**Components:** `AuthGate` (top-level gate), `LoginScreen`, `SyncProvider` (side-effect-only mount).

**Services:** none — `syncEngine.ts`/`tombstones.ts` are free functions, not a service-layer wrapper.

**Stores:** `authStore` (Supabase session + sync status — not an entity cache, wraps the Supabase Auth SDK directly).

**Database usage:** reads/writes all 17 synced tables generically, plus `syncTombstones` and `syncState` (sync cursor bookkeeping).

**Dependencies:** every entity-owning module (generic, via table name) for what it syncs; `src/features/encryption/` for whether payloads are encrypted before sync.

**Current Status:** Fully implemented, fully optional (the app is 100% functional with sync unconfigured).

**Future Plans:** None documented — no server-side business logic is planned; Supabase remains a relay only.

---

## 12. Encryption (`src/features/encryption/`)

**Purpose:** Optional client-side encryption-at-rest for synced data. Full detail in [SECURITY.md](SECURITY.md).

**Route:** none (surfaced via `EncryptionSettings.tsx`).

**Features:** AES-GCM 256-bit encryption of every synced row's business fields into one opaque `encryptedContent` blob (two fields — `recipientProfiles.recipientKey`, `budgets.category` — stay plaintext to preserve their unique-index lookups); a per-user Data Encryption Key (DEK) generated once, held only in memory at runtime; PBKDF2 (600,000 iterations) key derivation from either the device PIN (day-to-day unlock) or the user's Supabase account password (recovery escrow); a full migration flow (`enableEncryption`) that downloads a plaintext backup first, then re-encrypts every row in chunked batches with resumability; the symmetric inverse (`disableEncryption`) that decrypts every row back to plaintext, verifies none remain encrypted, and only then clears the wrapped DEK — deliberately the opposite flag-flip order from enable, so an interruption can never leave data permanently unreadable; a "re-escrow" repair flow for a broken/wrong escrow password; an account-password-based recovery flow for a device that's lost its local PIN; a "catch-up" detector for a device that pulled already-encrypted rows from another device before ever enabling encryption itself.

**Components:** `EnableEncryptionForm`, `DisableEncryptionForm`, `EncryptionRecoveryFlow`, `ReescrowDekForm`.

**Services:** none as a service layer — `crypto/encryption.ts` (WebCrypto primitives), `migration/enableEncryption.ts`, `migration/disableEncryption.ts`, `migration/migrationShared.ts` (table list/chunk size/migration lock shared by both directions), `migration/reescrowDek.ts`, `recovery/recoverDekFromEscrow.ts`, `catchUp.ts` are all free functions.

**Stores:** `encryptionSessionStore` (in-memory DEK only, deliberately never persisted).

**Database usage:** reads/rewrites all 17 synced tables during migration (`migration/migrationShared.ts`'s `ENCRYPTABLE_TABLES`, shared by both `enableEncryption` and `disableEncryption`) — `vaultEntries` is included (normally migrates zero rows, since Vault always writes already-encrypted, but covers a pre-existing row from before that gate existed); `workoutExercises`/`workoutEntries` were missing from this list entirely when the Workout Tracker shipped (a pre-existing row would have silently stayed plaintext forever after enabling encryption) — found and fixed 2026-08-18. The encryption wrapper itself (`src/database/encryptedRepository.ts`) sits underneath every repository, not owned by this module.

**Dependencies:** `src/features/sync/` (account-password escrow requires a signed-in Supabase user), `src/features/lock/` (the DEK is wrapped under the app-lock PIN for day-to-day unlock).

**Current Status:** Implemented for enable/disable/escrow/recover — see SEC-005 in [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md).

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

## 14. Vault (`src/features/vault/`)

**Purpose:** An encrypted password manager, secure notes, and recovery-key store — one unified entry model rather than three separate CRUD verticals.

**Route:** `/vault`.

**Features:** a single `VaultEntry` shape covering all three entry types via a `type: "password" | "note" | "recoveryKey"` discriminator — password entries carry `username`/`password`/`url`, notes carry `content`, recovery keys carry `serviceName`/`code`, and a free-text `note` field is shared by all three (they differ only in which optional fields are populated, since storage/encryption/sync/UI-list concerns are identical across all three); search (by title) + type filter; a reveal/hide toggle and one-tap clipboard copy for the secret field; a `crypto.getRandomValues`-based password generator (`generatePassword.ts`, 20 chars by default, toggleable upper/lower/numbers/symbols charsets — deliberately not `Math.random`, since this generates real secrets).

**The whole page is gated on encryption being enabled.** `Vault.tsx` reads `useAppLockStore((s) => s.encryptionEnabled)`; when it's `false`, the page renders an `EncryptionGate` (an "Enable Encryption" prompt reusing `EnableEncryptionForm` from the Encryption module, or a "sign in first" / "set a PIN first" message if the prerequisites for enabling aren't met yet) instead of the entry list, and `loadEntries()` is never even called. This makes "Vault is usable" and "encryption is on" equivalent by construction — the repository (`vaultEntryRepository.ts`) has no `plaintextKeys` option, unlike `recipientProfiles`/`budgets`, since every field here (including the title) is sensitive, so add/update only ever encrypt for real once the gate has passed.

**Components:** `VaultEntryCard`, `VaultEntryForm`.

**Services:** `vaultEntryService` (generic `createCrudService`).

**Stores:** `vaultEntryStore` (fetch-on-mount cache; `addEntry`/`updateEntry`/`deleteEntry` each call `recordAudit("vault", ...)` with the entry `type` only — title/username/password/content are never written to the audit log, matching the log's "no secret content" discipline — see section 16).

**Database usage:** `vaultEntries`.

**Dependencies:** `src/features/encryption/` (the page gate and the repository's always-encrypt behavior), `src/features/lock/` (`appLockStore.encryptionEnabled`/`isEnabled()`), `src/features/sync/` (`isSyncConfigured`, `authStore.user` — both feed the gate's prerequisite messaging), `src/features/security/` (audit logging).

**Current Status:** Fully implemented.

**Future Plans:** None documented.

---

## 15. Workout Tracker (`src/features/workouts/`)

**Purpose:** An exercise catalog + entry log, a work/rest interval timer, and real GPS route tracking.

**Route:** `/workouts`.

**Features:** two-table model like Category+Transaction, not a single-table shape — a `WorkoutExercise` catalog (name, category, icon/color, optional `caloriesPerMinute`/`caloriesPerRep`/`caloriesPerKm` rate, optional `youtubeUrl`, `gpsTracked` flag) and a `WorkoutEntry` log (denormalized `exerciseName` copy that survives the catalog entry being renamed/deleted, date, reps/rounds or duration or GPS distance+route, `caloriesBurned` computed once at save time and then frozen — never recomputed later even if the catalog exercise's rates change); `computeCaloriesBurned()` (`utils/calorieCalc.ts`) combines whichever calorie bases the exercise defines and the input actually supplies (from reps, from duration, from distance), rounded to a whole number; a "Track with GPS" alternative to manual reps/duration entry for `gpsTracked` exercises (running/cycling/walking-style moves); a Today panel + 14-dot recent-history strip (`utils/todaySummary.ts`, reusing `computeStreak`/`getRecentDates` from `features/habits/utils/streak` despite living under `workouts/`); an explicit-or-auto-built YouTube demo link (`utils/youtubeLink.ts` falls back to a YouTube search query built from the exercise name when no `youtubeUrl` is set — no YouTube Data API integration, no key/quota needed) opened via `utils/openExternal.ts`.

**Timer** (`timer/useIntervalTimer.ts`): a plain reducer-backed hook, not a Zustand store and not Dexie-backed — ephemeral, single-consumer UI state owned entirely by `WorkoutTimerDrawer`. Timestamp-based (`Date.now()`-derived), not a per-tick decrement, so it's immune to drift from a delayed render. Configurable work/rest seconds + total rounds; a zero-configured `restSeconds` skips the rest phase entirely rather than running a zero-length one; cascades through any zero-duration phases in a single tick via a bounded (`guard < 100`) loop rather than waiting for subsequent ticks to catch up; a naturally-completed session and a manual "Stop & Log" both funnel through the same `finish()` → `{ totalElapsedSeconds, roundsCompleted }` shape, which `WorkoutTimerDrawer` turns into a pre-filled `WorkoutEntryForm`.

**GPS tracker** (`gps/useGpsTracker.ts`): also a plain hook, not a store, same ephemeral/single-consumer reasoning as the timer. Foreground-only via `@capacitor/geolocation`'s `watchPosition` — no background-location permission is ever requested, and the watch is cleared both on explicit `stop()`/`reset()` and belt-and-suspenders on unmount. Distance is the Haversine great-circle sum over consecutive route points (`gps/distance.ts`'s `computeRouteDistanceMeters`), used both for the live on-screen distance while tracking and the final `distanceMeters` at stop. `WorkoutRouteMap` renders the route via Leaflet + react-leaflet with OpenStreetMap tiles (no API key) — a `CircleMarker` (SVG-drawn) rather than Leaflet's default pin, avoiding the well-known bundler issue where Leaflet's default marker image assets resolve to broken relative URLs under Vite.

**Components:** `WorkoutExerciseCard`/`WorkoutExerciseForm`, `WorkoutEntryCard`/`WorkoutEntryForm`, `WorkoutTimerDrawer`/`WorkoutTimerRing`, `WorkoutGpsTrackerDrawer`, `WorkoutRouteMap`, `WorkoutTodayPanel`.

**Services:** `workoutExerciseService`, `workoutEntryService` (both generic `createCrudService`).

**Stores:** `workoutExerciseStore`, `workoutEntryStore` (both fetch-on-mount caches; `workoutEntryStore.addEntry` awards XP via `gamificationStore`, `workoutExerciseStore` does not).

**Database usage:** `workoutExercises`, `workoutEntries`.

**Dependencies:** none on other feature modules for its core flow; reuses `features/habits/utils/streak` (generic despite the folder) for its history strip; `@capacitor/geolocation`, `@capacitor/browser`, `leaflet`/`react-leaflet` as direct third-party dependencies.

**Current Status:** Fully implemented.

**Future Plans:** None documented.

---

## 16. Security — Audit Log & Permission Manager (`src/features/security/`)

**Purpose:** An app-wide, persisted security audit trail — cross-cutting infrastructure like Encryption (section 12) and Lock (section 13), not a domain feature with its own page.

**Route:** none (no `pages/` — surfaced via `AuditLogSettings.tsx` → `AuditLogDrawer.tsx` in Settings).

**Features:** originally scoped to the Gallery Slip Scanner alone (GS-017/GS-038, six event categories: `permission`, `import`, `scan`, `delete`, `validation`, `suspicious`), widened to also cover `auth`, `encryption`, `lock`, `vault`, and `backup` — 11 `AuditEventType` values total. `auditLog.ts` holds a bounded in-memory ring buffer (`MAX_EVENTS = 200`, oldest dropped first) behind an injectable-sink pattern (`configureAuditLog({ sink })`), so callers (`recordAudit(type, action, detail?)`) don't need to know or care whether/how events are persisted; a throwing sink never breaks the caller. `main.tsx` wires the real sink at startup (`configureAuditLog({ sink: dexieAuditSink })`), so every `recordAudit()` call anywhere in the app survives a reload from that point on. `dexieAuditSink.ts` persists to a separate, independently-bounded cap (`MAX_PERSISTED_EVENTS = 500`, larger than the in-memory cap since persistence changes the retention tradeoff — cheap to keep more once it's not living in every tab's JS heap) — oldest rows past the cap are pruned by `at` after each write. Deliberately records only non-sensitive metadata (counts, statuses, ids, booleans), never secret/financial content, so the trail itself is safe to keep and inspect. `securityAuditView.ts` layers security-specific recorders (`recordDeletionAudit`, `recordValidationFailureAudit`, `recordSuspiciousAudit`) and a `summarizeSecurityAudit()` tally over the in-memory buffer, excluding routine `scan` progress events. `AuditLogDrawer.tsx` (via `useAuditLog.ts`) lists every **persisted** row newest-first with a search (over the action string) + type filter, and a manual "Clear" action.

**Call sites (non-exhaustive, illustrating the widened coverage):** `authStore.ts` — sign-up/sign-in (success and failure)/sign-out; `encryption/migration/enableEncryption.ts` — `"enabled"` on migration completion; `encryption/migration/reescrowDek.ts` — `"re-escrowed"`; `store/appLockStore.ts` — pin-setup, pin-changed, disabled, biometric-enabled/disabled, and **failed** unlock attempts (`"unlock-failed"`) — deliberately not successful unlocks, to avoid noise from routine daily use; `vaultEntryStore.ts` — created/updated/deleted, entry `type` only, never title/username/password/content; `database/backupService.ts` — exported/imported/reset.

**Components:** `AuditLogDrawer` (the Settings-launched viewer).

**Services:** none as a service layer — `auditLog.ts`, `dexieAuditSink.ts`, `securityAuditView.ts` are free functions/modules; `auditLogRepository.ts` is a thin hand-written Dexie wrapper (`add`/`list`/`clear`), not the generic `createRepository` factory, since this is device-local operational state rather than a synced entity (same reasoning as `importHistoryRepository`).

**Stores:** none — `useAuditLog.ts` is a plain hook (`useState`/`useEffect`), not Zustand.

**Database usage:** `auditLog` — local-only, **not** one of the 17 synced tables (see section 11).

**Dependencies/Dependents:** consumed by `sync/store/authStore.ts`, `encryption/migration/enableEncryption.ts` + `reescrowDek.ts`, `store/appLockStore.ts`, `vault/store/vaultEntryStore.ts`, `database/backupService.ts` — every module that writes a security-relevant event calls into this one; this module depends on none of them back.

**Current Status:** Fully implemented.

**Future Plans:** None documented.

### Permission Manager (`src/features/security/permissions/`, SEC-001)

A single dedicated view aggregating every OS-level permission the app requests — previously each feature checked/requested its own permission inline with no shared view (Gallery Slip Scanner, Workout Tracker GPS, reminders, Payment Notification Capture).

**How it works:** `permissionManagerService.ts`'s `listPermissions()` calls into the existing check function for each of four permission surfaces (reused, not reimplemented — `galleryPermissionService.check()`, `Geolocation.checkPermissions()`, `LocalNotifications.checkPermissions()`, `PaymentNotificationCapture.checkAccess()`) and normalizes every result onto the Gallery Scanner's pre-existing 6-value status union (`granted`/`limited`/`prompt`/`denied`/`blocked`/`unavailable`), which already covered every state any of the four can produce. Camera and biometric are deliberately excluded — the app never does live camera capture (only the permission-less OS photo picker), and biometric is a capability check already surfaced in `SecuritySettings.tsx`, not an OS "grant." A plain status check can't distinguish a soft denial from a permanent one on Android — only a request's before/after comparison can — so `"blocked"` only ever appears as the *result* of an attempted request, mirroring `galleryPermissionService.ts`'s own established technique (reused directly for Location and Local Notifications rather than reimplemented).

**New native capability**: `AppSettingsPlugin.java` (`android/app/src/main/java/com/nexus/app/settings/`) — one `open()` method opening this app's generic system Settings screen (`Settings.ACTION_APPLICATION_DETAILS_SETTINGS`), mirroring `PaymentNotificationCapturePlugin.java`'s existing single-purpose `openAccessSettings()`. Nothing generic like this existed before — a blocked Gallery/Location/Local-Notifications permission was otherwise a dead end with no in-app recovery path. Notification Access keeps using its own dedicated Settings screen (a different one); the new generic method is used only for the other three.

**UI:** `PermissionManagerSettings.tsx` (Settings > Security & Sync) opens `PermissionManagerDrawer.tsx` — mirrors `AuditLogSettings.tsx`/`AuditLogDrawer.tsx`'s exact card-opens-drawer shape. Lists all four permissions with a status badge, a one-line "used by" description, and a contextual action (Request / Open Settings / nothing once granted); refreshes on mount and on native app resume, mirroring `NotificationCaptureSettings.tsx`'s exact resume-listener pattern.

**Non-goals:** no permission revocation from within the app (Android provides no API for this — only its own Settings screen can, which "Open Settings" already reaches); no polling/background change detection; no permission history (that's the Audit Log's job, unaffected by this feature).

**Current Status:** Complete.

---

## Shared / cross-cutting (not `features/`)

Briefly, since these support every module above rather than owning a domain: `src/components/` (shared UI, see [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md)), `src/database/` (Dexie + factories, see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)), `src/store/` (global stores, see [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)), `src/layouts/` + `src/router/` (see [ROUTING.md](ROUTING.md)), `src/i18n/` (Thai/English translation dictionary), `src/ai/` (the parked AI Gateway, see [AI_ANALYTICS.md](AI_ANALYTICS.md)), `src/lib/` (Supabase + Sentry client setup, see [DEPLOYMENT.md](DEPLOYMENT.md)).

## Current Status

15 feature modules exist; 14 are actively developed and fully implemented for their current scope, 1 (`calendar/`) is intentionally orphaned/dead. See each module section above for specifics.

## Future Improvements

See [ROADMAP.md](ROADMAP.md) for the consolidated Planned/Future list across all modules.
