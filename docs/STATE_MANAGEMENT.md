# State Management

**Last Updated:** 2026-08-30

## Overview

All client state is managed with **Zustand 5** — no Redux, no Context-based state containers (React Context is used only for a couple of pure side-effect components, not state). There are two tiers: **global stores** (`src/store/*.ts`, app-wide concerns) and **per-feature entity stores** (`src/features/<name>/store/*.ts`, one per Dexie-backed entity). Feature stores are never persisted by Zustand's own `persist` middleware — persistence for entity data goes through Dexie via the service/repository layer instead; only preference/session-type global stores use `persist` (to `localStorage`/`sessionStorage`).

## Zustand Stores

### Global stores (`src/store/`)

| Store | State | Persists to | Notes |
|---|---|---|---|
| `toastStore` | `toasts: Toast[]` | — (in-memory) | auto-dismiss after 4000ms |
| `notificationStore` | `dismissedIds: string[]` | `localStorage: nexus-dismissed-notifications` | notifications themselves are computed fresh each render by `useNotifications`, not stored |
| `languageStore` | `language: "en" \| "th"` (default `"th"`) | `localStorage: nexus-language` | |
| `appSettingsStore` | `themeMode, currency, dateFormat, numberFormat` | `localStorage: nexus-app-settings` | pure display preferences |
| `appLockStore` | PIN/lock fields + encryption-at-rest fields (`encryptionEnabled, wrappedDek, kekSalt, kekIterations`) + `biometricEnabled` | `localStorage: nexus-app-lock` (via explicit `partialize`) + `sessionUnlocked` mirrored to `sessionStorage` | writes/clears the in-memory DEK on unlock/lock via `encryptionSessionStore`; internally composed from 3 Zustand slices in `store/appLock/` (`pinLockSlice`, `biometricSlice`, `encryptionKeySlice`) — the exported `useAppLockStore` and its state shape are unchanged, only the internal file split is new |
| `gamificationStore` | `xp, streak, lastActiveDate` | `localStorage: nexus-gamification` | `addXp()` fires a level-up toast via `toastStore` |

### Feature stores (`src/features/*/store/*.ts`) — 37 total

| Store | Entity | Pattern | Key actions |
|---|---|---|---|
| `finance/accountStore` | `Account` | fetch-on-mount cache | load, add, update, delete, merge |
| `finance/budgetStore` | `Budget` | fetch-on-mount cache | load, add, update, delete |
| `finance/budgetPeriodSnapshotStore` | `BudgetPeriodSnapshot` | fetch-on-mount cache, **read-only** | load only |
| `finance/categoryStore` | `Category` | fetch-on-mount cache | load, add, update, delete, merge |
| `finance/goalStore` | `Goal` | fetch-on-mount cache | load, add, update, delete, `contribute` (awards XP, logs milestones) |
| `finance/goalMilestoneEventStore` | `GoalMilestoneEvent` | fetch-on-mount cache, **read-only** | load only |
| `finance/merchantStore` | `Merchant` | fetch-on-mount cache | load, add, update, delete |
| `finance/netWorthItemStore` | `NetWorthItem` | fetch-on-mount cache | load, add, update, delete (each mutation upserts today's `NetWorthSnapshot`) |
| `finance/netWorthSnapshotStore` | `NetWorthSnapshot` | fetch-on-mount cache, **read-only** | load only |
| `finance/subscriptionStore` | `Subscription` | fetch-on-mount cache | load, add, update (incl. status transitions), delete (schedules/cancels an opt-in reminder on add/update/delete, mirroring `habitStore`'s pattern) |
| `finance/recipientProfileStore` | `RecipientProfile` | fetch-on-mount cache, **no add/update** (server-derived) | load, delete |
| `finance/transactionStore` | `Transaction` | fetch-on-mount cache | load, add (awards XP), update, delete, toggleFavorite |
| `finance/transactionTemplateStore` | `TransactionTemplate` | fetch-on-mount cache | load, add, update, delete |
| `finance/uiStore` | Transaction drawer UI | pure UI state, no service | open/close drawer, open-with-draft |
| `finance/notificationCapture/pendingNotificationCandidateStore` | `SlipCandidate` (built from native payment notifications) | **not Dexie-backed** — reads/clears candidates via the native `PaymentNotificationCapture` plugin | refresh (parse + drop unparseable), acknowledge |
| `finance/slipScanner/bankSelectionStore` | pre-scan bank selection | `persist` to `localStorage`, **not Dexie-backed** | setSelectedBankIds, reset — remembers the user's bank picks across sessions ("remember previous selection") |
| `finance/slipScanner/categoryLearningStore` | slip category corrections (GS-043/GS-045), keyed by normalized merchant/title | `persist` to `localStorage`, **not Dexie-backed** | learn, asMap, reset — local-only, no cloud AI |
| `finance/slipScanner/learningStore` | Smart Learning Engine corrections — merchant name / OCR text / bank naming (GS-045) | `persist` to `localStorage`, **not Dexie-backed** | learnMerchant, learnOcr, learnBankName, reset |
| `finance/slipScanner/scanScheduleStore` | scan-schedule config + last-completed-scan time | `persist` to `localStorage`, **not Dexie-backed** | setConfig, markScanned, reset — gates the battery-aware scan scheduler's interval check |
| `finance/slipScanner/scanStore` | active gallery-scan session status/progress | ephemeral — the live `ScanSession` control handle is held in a module-level variable outside the store, only status/progress are rendered state | start, pause, resume, cancel |
| `finance/slipScanner/scannerAnalyticsStore` | cumulative scanner run counters (aggregate only, no slip content) | `persist` to `localStorage`, **not Dexie-backed** | recordRun (folds via a pure `mergeRun`), reset |
| `trading/tradeStore` | `Trade` | fetch-on-mount cache | load, add/update (awards XP on close), delete |
| `trading/tradingUIStore` | Trade drawer UI | pure UI state | open/close drawer |
| `trading/riskConfigStore` | daily/weekly max-loss limits | `persist` to `localStorage`, **not Dexie-backed** — trading-specific, kept separate from `appSettingsStore` | setMaxDailyLossLimit, setMaxWeeklyLossLimit (`null` = no limit set, distinct from `0`) |
| `trading/strategyStore` | `Strategy` | fetch-on-mount cache | load, add, update, delete |
| `trading/watchlistStore` | `WatchlistItem` | fetch-on-mount cache | load, add, update, delete |
| `trading/economicEventStore` | `EconomicEvent` | fetch-on-mount cache | load, add, update, delete |
| `habits/habitStore` | `Habit` | fetch-on-mount cache + reminder scheduling | load, add/update/delete (schedule/cancel native reminders), `checkIn` (idempotent, awards XP) |
| `portfolio/holdingStore` | `Holding` | fetch-on-mount cache | load, add, update, delete, `updateCurrentPrice` |
| `schedule/scheduleItemStore` | `ScheduleItem` | fetch-on-mount cache + reminder scheduling | load, add, update, delete |
| `todo/todoStore` | `Todo` | fetch-on-mount cache | load, add, update, delete, `toggleComplete` (awards XP only on completing) |
| `vault/vaultEntryStore` | `VaultEntry` | fetch-on-mount cache | load, add, update, delete (each mutation records an audit-log event) |
| `workouts/workoutExerciseStore` | `WorkoutExercise` | fetch-on-mount cache | load, add, update, delete |
| `workouts/workoutEntryStore` | `WorkoutEntry` | fetch-on-mount cache | load, add (awards XP), update, delete |
| `sync/authStore` | Supabase session + sync status + MFA challenge state | wraps the Supabase Auth SDK directly, not a repo cache | initialize, signUp, signIn, signOut, sync, verifyMfaCode, verifyBackupCode, cancelMfaChallenge |
| `encryption/encryptionSessionStore` | In-memory DEK (`CryptoKey`) | ephemeral, deliberately **not** persisted | setDek, clearDek |
| `dashboard/dashboardPeriodStore` | Period selector UI | pure UI state | setGranularity |

`executive/` (EXEC-001) has no store — see the note below the table.

`src/features/executive/` (EXEC-001) deliberately owns **no store of its own** — it has no entity and no Dexie table, so there is nothing to cache. Its `hooks/useExecutiveDashboard.ts` is a plain orchestration hook that reads the feature stores listed above directly (todo/habit/schedule/goal/goalMilestoneEvent/workoutEntry) plus the outputs of `useBudgetProgress`/`useNetWorthStats`/`useTradingStats`, and hands the combined result to pure functions in `executive/engine/` — the same "derive, don't duplicate" rule every other read-only view in this app already follows.

**Uniform pattern for every entity store:** `set({loading:true})` → `service.list()` → `set({data, loading:false})`; mutations call the service then re-`list()` rather than optimistically patch. Every entity store spreads `initialAsyncState` and normalizes errors via `toErrorMessage`. **Deliberate convention:** mutation failures throw and are *not* written to the store's own `error` field — that field is reserved for the list-load error, so a failed add/update/delete is handled locally by the calling component, not surfaced through the store.

## State Flow

```
Page mounts → store.load*() → service.list() → repository.getAll() → Dexie (decrypted if needed)
                                                                              │
                                                          store.set({data, loading:false})
                                                                              │
Component reads via useStore(s => s.field) ─────────────────────────────────┘
```

Mutations follow the same round-trip: component calls a store action → service → repository → Dexie write (encrypted + sync-metadata-stamped if applicable) → store re-fetches the full list. There is no optimistic-update path anywhere in the app.

## Shared State

- **Gamification (XP/streak) is the one piece of state genuinely shared across otherwise-unrelated modules**: `transactionStore.addTransaction`, `habitStore.checkIn`, `todoStore.toggleComplete`, `tradeStore.addTrade`/`updateTrade`, and `goalStore.contribute` all call `useGamificationStore.getState().addXp(...)` imperatively (via `getState()`, not a hook — since these calls happen inside store action bodies, not React components).
- **The in-memory DEK** (`encryptionSessionStore`) is written/cleared exclusively by `appLockStore`'s `unlock`/`lock`/`attachEncryption`/`completeRecovery` actions — no other store touches it.
- **`appSettingsStore`'s `themeMode`** drives `ThemeEffect.tsx` (applies the resolved theme class to `<html>`) and `ThemeToggleSwitch.tsx`.

## Store Responsibilities

Each entity store owns exactly one Dexie table's client-side cache and nothing else — no store spans multiple entities. UI-only stores (`uiStore`, `tradingUIStore`, `dashboardPeriodStore`) hold zero persisted data and exist purely to share drawer-open/period-selection state between a layout-level trigger (e.g. the mobile FAB) and the page/drawer that renders it.

## Store Relationships

No store subscribes to another store reactively (no store-in-a-store composition) — all cross-store coordination happens either (a) imperatively via `getState()` calls from within an action body (the gamification/XP pattern, and `appLockStore` ↔ `encryptionSessionStore`), or (b) by components composing multiple stores' hooks together. The most extreme composition point is `TopBar.tsx`, which subscribes to 12 stores at once (11 feature stores' `load*` actions + `appSettingsStore`) to eagerly load header-widget data on mount regardless of route — see [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md) for why this is deliberate, not accidental coupling.

### The TopBar re-render fix (a documented perf pattern worth preserving)

Widening `useGlobalSearch` to index every entity type (11 stores) previously caused `TopBar` and its children to re-render on unrelated state changes. The fix, still in place:
1. `TopBar.tsx` selects only the **stable action function** from each store (`useTransactionStore((s) => s.loadTransactions)`, never the data itself) — so `TopBar` never re-renders when the underlying data changes.
2. `useGlobalSearch` selects only each store's searchable collection, so loading/error/action changes do not re-render it. `GlobalSearch`, `LevelBadge`, `UserMenu`, and `NotificationsMenu` are also wrapped in `memo()` and take no props, isolating their subscriptions from their siblings.
3. `TopBar` eagerly loads only transactions and budgets, which its always-visible notifications require. `GlobalSearch` loads its nine additional collections once, on first focus, instead of forcing those reads on every route before search is used.
4. `LevelBadge`/`UserMenu` use narrow single-field selectors (`s.xp`, `s.isEnabled()`) rather than whole-store destructuring.

The same rule now applies to every store-backed AI Analytics computation hook: `useFinancialAnalysis` selects its six inputs; `useFinancialHealthTrend` and `useWhatIfScenario` select five each; and `useCategoryDetail` selects three. Loading/error/action changes therefore cannot trigger another full analysis, six-point trend pass, scenario simulation, or category-detail calculation.

Any future component mounted directly in `TopBar`/`MainLayout` that needs broad store access should follow the same `memo()`-isolation pattern rather than subscribing broadly at the layout level.

## Current Status

Fully implemented — 6 global stores, 37 feature stores, all following the conventions documented above. Most Dexie-backed entity stores follow the fetch-on-mount-cache pattern; the exceptions are `pendingNotificationCandidateStore` (reads from a native plugin, not Dexie) and the `localStorage`-`persist`ed, **not** Dexie-backed device-local config stores — `slipScanner/bankSelectionStore`, `slipScanner/categoryLearningStore`, `slipScanner/learningStore`, `slipScanner/scanScheduleStore`, `slipScanner/scannerAnalyticsStore`, and `trading/riskConfigStore` — plus `slipScanner/scanStore`, which holds ephemeral in-progress scan state that isn't persisted at all.

## Future Improvements

None documented in-code. The `TopBar` 12-store mount-time load list is the natural next place to look if further splitting is ever needed (see [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md)), though it isn't currently a problem.
