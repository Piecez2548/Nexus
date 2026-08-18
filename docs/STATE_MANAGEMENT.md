# State Management

**Last Updated:** 2026-08-18

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
| `appLockStore` | PIN/lock fields + encryption-at-rest fields (`encryptionEnabled, wrappedDek, kekSalt, kekIterations`) + `biometricEnabled` | `localStorage: nexus-app-lock` (via explicit `partialize`) + `sessionUnlocked` mirrored to `sessionStorage` | writes/clears the in-memory DEK on unlock/lock via `encryptionSessionStore` |
| `gamificationStore` | `xp, streak, lastActiveDate` | `localStorage: nexus-gamification` | `addXp()` fires a level-up toast via `toastStore` |

### Feature stores (`src/features/*/store/*.ts`) — 25 total

| Store | Entity | Pattern | Key actions |
|---|---|---|---|
| `finance/accountStore` | `Account` | fetch-on-mount cache | load, add, update, delete, merge |
| `finance/budgetStore` | `Budget` | fetch-on-mount cache | load, add, update, delete |
| `finance/categoryStore` | `Category` | fetch-on-mount cache | load, add, update, delete, merge |
| `finance/goalStore` | `Goal` | fetch-on-mount cache | load, add, update, delete, `contribute` (awards XP, logs milestones) |
| `finance/goalMilestoneEventStore` | `GoalMilestoneEvent` | fetch-on-mount cache, **read-only** | load only |
| `finance/netWorthItemStore` | `NetWorthItem` | fetch-on-mount cache | load, add, update, delete (each mutation upserts today's `NetWorthSnapshot`) |
| `finance/netWorthSnapshotStore` | `NetWorthSnapshot` | fetch-on-mount cache, **read-only** | load only |
| `finance/subscriptionStore` | `Subscription` | fetch-on-mount cache | load, add, update (incl. status transitions), delete |
| `finance/recipientProfileStore` | `RecipientProfile` | fetch-on-mount cache, **no add/update** (server-derived) | load, delete |
| `finance/transactionStore` | `Transaction` | fetch-on-mount cache | load, add (awards XP), update, delete, toggleFavorite |
| `finance/transactionTemplateStore` | `TransactionTemplate` | fetch-on-mount cache | load, add, update, delete |
| `finance/uiStore` | Transaction drawer UI | pure UI state, no service | open/close drawer, open-with-draft |
| `finance/notificationCapture/pendingNotificationCandidateStore` | `SlipCandidate` (built from native payment notifications) | **not Dexie-backed** — reads/clears candidates via the native `PaymentNotificationCapture` plugin | refresh (parse + drop unparseable), acknowledge |
| `trading/tradeStore` | `Trade` | fetch-on-mount cache | load, add/update (awards XP on close), delete |
| `trading/tradingUIStore` | Trade drawer UI | pure UI state | open/close drawer |
| `habits/habitStore` | `Habit` | fetch-on-mount cache + reminder scheduling | load, add/update/delete (schedule/cancel native reminders), `checkIn` (idempotent, awards XP) |
| `portfolio/holdingStore` | `Holding` | fetch-on-mount cache | load, add, update, delete, `updateCurrentPrice` |
| `schedule/scheduleItemStore` | `ScheduleItem` | fetch-on-mount cache + reminder scheduling | load, add, update, delete |
| `todo/todoStore` | `Todo` | fetch-on-mount cache | load, add, update, delete, `toggleComplete` (awards XP only on completing) |
| `vault/vaultEntryStore` | `VaultEntry` | fetch-on-mount cache | load, add, update, delete (each mutation records an audit-log event) |
| `workouts/workoutExerciseStore` | `WorkoutExercise` | fetch-on-mount cache | load, add, update, delete |
| `workouts/workoutEntryStore` | `WorkoutEntry` | fetch-on-mount cache | load, add (awards XP), update, delete |
| `sync/authStore` | Supabase session + sync status | wraps the Supabase Auth SDK directly, not a repo cache | initialize, signUp, signIn, signOut, sync |
| `encryption/encryptionSessionStore` | In-memory DEK (`CryptoKey`) | ephemeral, deliberately **not** persisted | setDek, clearDek |
| `dashboard/dashboardPeriodStore` | Period selector UI | pure UI state | setGranularity |

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

Widening `useGlobalSearch` to index every entity type (11 stores, whole-store destructuring) previously caused `TopBar` and its children to re-render on unrelated state changes. The fix, still in place:
1. `TopBar.tsx` selects only the **stable action function** from each store (`useTransactionStore((s) => s.loadTransactions)`, never the data itself) — so `TopBar` never re-renders when the underlying data changes.
2. `GlobalSearch`, `LevelBadge`, `UserMenu`, `NotificationsMenu` are each wrapped in `memo()` and take no props, isolating their own necessarily-broader subscriptions from their siblings.
3. `LevelBadge`/`UserMenu` use narrow single-field selectors (`s.xp`, `s.isEnabled()`) rather than whole-store destructuring.

Any future component mounted directly in `TopBar`/`MainLayout` that needs broad store access should follow the same `memo()`-isolation pattern rather than subscribing broadly at the layout level.

## Current Status

Fully implemented — 6 global stores, 22 feature stores, all following the conventions documented above (`pendingNotificationCandidateStore` is the one exception to the Dexie-backed norm, noted in the table).

## Future Improvements

None documented in-code. The `TopBar` 12-store mount-time load list is the natural next place to look if further splitting is ever needed (see [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md)), though it isn't currently a problem.
