# Dependency Graph

**Last Updated:** 2026-08-02

## Overview

Nexus's feature modules are deliberately loosely coupled — most have zero dependencies on each other, and the few real cross-module dependencies are narrow and one-directional. This was verified directly rather than assumed: `npx madge --circular --extensions ts,tsx src` was run against all 816 TypeScript/TSX files in `src/` on 2026-08-02 and reported **"No circular dependency found!"**

## Module Dependencies

```
dashboard/  ──(read-only, store subscriptions)──▶  finance, trading, portfolio, todo, habits, schedule
finance/aiAnalytics/  ──(reads store data)──▶  finance (core)
habits/, schedule/  ──▶  reminders/
lock/  ──▶  encryption/ (unlocking with the PIN also unwraps the session DEK)
encryption/  ──▶  sync/ (account-password escrow requires a signed-in Supabase user)
sync/  ──▶  (generically) every synced feature module, by table name only — never imports a module's types
trading/, portfolio/, todo/, calendar/(orphaned)  ──▶  (none)
```

Everything else (`components/`, `database/`, `hooks/`, `i18n/`, `layouts/`, `lib/`, `router/`, `store/`, `utils/`) sits *below* every feature module as shared infrastructure, never importing from `features/` back up (confirmed no reverse imports found).

`src/ai/` (the AI Gateway) is imported by **nothing** outside itself — 14 files, zero external importers, confirmed via repo-wide grep. It is a fully self-contained, currently-unreachable subtree — see [AI_ANALYTICS.md](AI_ANALYTICS.md).

## Shared Utilities

Cross-cutting, imported by many modules, owned by none:

| Path | Provides |
|---|---|
| `src/utils/syncMeta.ts` | `SyncMeta`, `withSyncMeta()` — used inside `createRepository`, so most feature code never imports it directly |
| `src/utils/asyncState.ts` | `AsyncState`, `initialAsyncState`, `toErrorMessage()` — spread into every entity store |
| `src/utils/leveling.ts`, `src/utils/xpRewards.ts` | Gamification math, read by `gamificationStore` and 5 feature stores that award XP |
| `src/utils/csv.ts` | CSV field escaping, the base every CSV exporter builds on |
| `src/utils/localDate.ts`, `src/utils/theme.ts`, `src/utils/download.ts`, `src/utils/numberField.ts`, `src/utils/selectField.ts` | Small cross-cutting helpers |
| `src/i18n/useTranslation.ts` | `useTranslation()` hook + standalone `translate()` for non-React callers (e.g. Zustand stores) |
| `src/hooks/useClickOutside.ts` | The popover-close pattern reused by every dropdown component |

## Shared Services / Infrastructure

| Path | Provides | Consumed by |
|---|---|---|
| `src/database/db.ts` | The one Dexie instance | Every repository |
| `src/database/encryptedRepository.ts`, `createRepository.ts`, `createCrudService.ts` | Repository/service factories | ~12 repositories, ~9 services across every synced module |
| `src/database/backupService.ts` | Export/import/reset all data | `DataSettings.tsx`, `DangerZoneSettings.tsx` |
| `src/features/sync/syncEngine.ts` | `runFullSync()` | `SyncProvider` only |
| `src/features/reminders/services/nativeReminderService.ts` | `scheduleReminder`/`cancelReminder` | `habits/`, `schedule/` only |
| `src/lib/supabaseClient.ts` | `supabase`, `isSyncConfigured` | `sync/`, `encryption/` |
| `src/lib/sentry.ts` | `initErrorMonitoring()` | `main.tsx`, `ErrorBoundary.tsx` |

## Dependency Direction

Strictly layered, confirmed with no exceptions found:

```
pages → components/hooks → stores → services → repositories → database/db.ts
                                          ↑
                          (wrapped by) encryption + sync, opt-in, transparent
```

Higher layers never get imported by lower ones. Within `features/finance/aiAnalytics/engine/`, dependency direction is also strictly layered and one-directional (see [AI_ANALYTICS.md](AI_ANALYTICS.md) for the full breakdown): `analyzers/` (base facts) → `scoring/`, `behavior/`, `forecast/`, `recommendation/` (synthesis, each depending only on `analyzers/` + `rules/` +, in forecast's case, `behavior/` and `scoring/`) → `executiveSummary/` (top of the pyramid, depends on all four synthesis engines) → `coach/` (reads the fully-assembled result, sits outside the batch pipeline as a query layer).

## Circular Dependencies

**None found.** Verified via `madge --circular` across all 816 `.ts`/`.tsx` files in `src/` (see Overview). This is treated as a standing constraint, not an accident — the strict store → service → repository layering and the "shared code never imports from `features/`" rule are what keep it that way; a change that introduces a cycle would be a regression against this documented baseline.

## Tight Coupling

- **`TopBar.tsx` subscribes to 12 stores** (11 feature stores for their `load*` actions, plus `appSettingsStore`) to eagerly load data for header widgets (global search, notifications) regardless of the active route. This is deliberate — not accidental coupling — and was already tuned once: narrow per-store selectors + `memo()` on `GlobalSearch`/`LevelBadge`/`UserMenu`/`NotificationsMenu` were added specifically to stop this broad subscription surface from cascading re-renders (see [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)). Still worth flagging as the single most cross-cutting file in the app.
- **`useGlobalSearch.ts` reads all 11 data stores' full state** (whole-store destructuring, not narrow selectors) to build a unified search index. Accepted as-is because it's isolated behind `GlobalSearch`'s own `memo()` boundary, so the necessarily-broad subscription doesn't leak to siblings.
- **`PLAINTEXT_KEYS`** (which fields stay unencrypted per table) is independently hand-duplicated in three places: each `createRepository` call's `plaintextKeys` option, `backupService.ts`, and `enableEncryption.ts` — a coupling-by-convention with no compiler-enforced single source of truth (each file's own comment says so explicitly). See [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).
- **`goalStore` / `transactionStore` / `habitStore` / `todoStore` / `tradeStore` all call `useGamificationStore.getState().addXp(...)` imperatively** (not via a hook) — a real but narrow one-directional coupling, all five one-way into the single gamification store.

## Possible Improvements

- Consolidate `PLAINTEXT_KEYS` into one exported constant that `encryptedRepository` call sites, `backupService`, and `enableEncryption` all import, removing the three-way hand-sync requirement.
- If the codebase grows further, `TopBar.tsx`'s 12-store mount-time load list is the natural next place to look for further splitting (e.g. moving the load-on-mount responsibility into a dedicated app-bootstrap hook rather than a layout component) — not urgent today since the perf issue it once caused is already fixed.
- No action needed on the AI Gateway's zero-importer status — it's an intentional, documented seam (see [DECISIONS.md](DECISIONS.md)), not something to "clean up."

## Current Status

Verified accurate as of 2026-08-02 via direct tooling (`madge`) and repo-wide grep, not inferred from documentation or memory.

## Future Improvements

See "Possible Improvements" above.
