# Project Architecture

**Last Updated:** 2026-08-18

## Overview

Nexus is a **local-first, feature-first** single-page application. Every domain (finance, trading, portfolio, todo, habits, schedule, AI analytics, sync, encryption, app lock, vault, workout tracking) lives in its own `src/features/<name>/` folder with an identical internal shape, and the UI always talks to IndexedDB through a fixed store → service → repository layering — never directly. Cloud sync and encryption-at-rest are optional layers bolted onto the same repositories, not a parallel data path.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React Router pages (lazy-loaded)                            │
│  src/features/<name>/pages/*.tsx                              │
└───────────────┬─────────────────────────────────────────────┘
                │ reads/calls
┌───────────────▼─────────────────────────────────────────────┐
│  Zustand stores (per-feature)                                 │
│  src/features/<name>/store/*.ts                                │
│  fetch-on-mount, re-fetch-after-mutation caches over services │
└───────────────┬─────────────────────────────────────────────┘
                │ calls
┌───────────────▼─────────────────────────────────────────────┐
│  Services                                                      │
│  src/features/<name>/services/*.ts                             │
│  createCrudService() factory, or hand-written for merge/guard  │
│  business logic (accountService, categoryService, ...)        │
└───────────────┬─────────────────────────────────────────────┘
                │ calls
┌───────────────▼─────────────────────────────────────────────┐
│  Repositories                                                  │
│  src/features/<name>/repositories/*.ts                         │
│  createRepository() factory: encryption + sync metadata +      │
│  tombstone recording wrapped around a raw Dexie Table          │
└───────────────┬─────────────────────────────────────────────┘
                │ reads/writes
┌───────────────▼─────────────────────────────────────────────┐
│  src/database/db.ts — one Dexie (IndexedDB) database,          │
│  26 tables, 21 schema versions                                 │
└─────────────────────────────────────────────────────────────┘
        ▲                                              ▲
        │ optional, opt-in                              │ optional, opt-in
┌───────┴───────────────┐                    ┌──────────┴──────────────┐
│ src/features/sync/      │                    │ src/features/encryption/  │
│ push/pull relay against │                    │ client-side AES-GCM       │
│ one generic Supabase     │                    │ encrypt-on-write /        │
│ table (synced_records)   │                    │ decrypt-on-read          │
└─────────────────────────┘                    └───────────────────────┘
```

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for the full table list and [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md) for the exact factory contracts.

## Layered Architecture

1. **Pages** (`features/<name>/pages/*.tsx`) — route-mounted (see [ROUTING.md](ROUTING.md)), own loading/error/empty-state branches, compose components and hooks. They call a store's `load*()` action on mount; they never import a service or repository directly.
2. **Components** (`features/<name>/components/*.tsx`) — presentational + form components local to one feature; cross-feature-reusable pieces live in `src/components/ui/` instead (see [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md)).
3. **Hooks** (`features/<name>/hooks/*.ts`) — derived/computed data (`useDashboard`, `useBudgetProgress`, `useTradingStats`, ...) built with `useMemo` over store state; no side effects beyond reading stores.
4. **Stores** (`features/<name>/store/*.ts`) — Zustand, one per entity. Uniformly a **fetch-on-mount, re-fetch-after-mutation cache** over a service (`set({loading:true})` → `service.list()` → `set({data, loading:false})`; mutations call the service then reload rather than optimistically patch state). See [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md).
5. **Services** (`features/<name>/services/*.ts`) — either the generic `createCrudService()` factory (`{list, create, update, remove}`) or a hand-written service with real extra logic (delete guards, merge, the recipient-learning write path).
6. **Repositories** (`features/<name>/repositories/*.ts`) — either the generic `createRepository()` factory (`{getAll, add, update, remove, decryptOptional}`, wiring in encryption + sync metadata + tombstone recording automatically) or hand-written for a genuinely different shape (read-only `merchantRepository`, extra-method `goalMilestoneEventRepository`).
7. **Database** (`src/database/db.ts`) — the single Dexie instance every repository ultimately reads/writes.

**Rule enforced throughout the codebase:** UI code never imports Dexie or a repository directly — only through a store. This is what makes the encryption and sync layers transparent to every page/component built on top of them.

## Module Responsibilities

Every `src/features/<name>/` module owns one domain end-to-end (types, schema, repository, service, store, hooks, components, pages). See [MODULES.md](MODULES.md) for the complete per-module breakdown of all 15 feature modules. Shared, cross-feature code lives outside `features/`:

- `src/components/` — shared UI (design-system components, settings panels, import/export panels).
- `src/database/` — the Dexie instance and the repository/service factories every feature module builds on.
- `src/store/` — global (not per-entity) state: toasts, notifications, language, app settings, app lock, gamification.
- `src/hooks/`, `src/utils/`, `src/i18n/`, `src/layouts/`, `src/router/`, `src/lib/`, `src/providers/` — cross-cutting infrastructure, each covered in its own doc ([STATE_MANAGEMENT.md](STATE_MANAGEMENT.md), [ROUTING.md](ROUTING.md), [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md)).
- `src/ai/` — the AI Gateway. Fully built (provider registry, request/response DTOs, a local rule provider) but **not imported by any feature** — an explicitly parked future-integration seam, not dead code. See [AI_ANALYTICS.md](AI_ANALYTICS.md).

## Data Flow

**Read path:** Page mounts → calls `store.load*()` → store calls `service.list()` → service calls `repository.getAll()` → repository reads the Dexie table and, if encryption is enabled, decrypts each row's `encryptedContent` blob → store sets state → page/hook renders it.

**Write path:** Form submits → component calls a store action (`addTransaction`, `updateHabit`, ...) → store calls `service.create/update/remove()` → service calls `repository.add/update/remove()` → repository stamps `syncId`/`updatedAt` (`withSyncMeta`), encrypts if enabled, writes to Dexie, and on delete records a `Tombstone` row → store re-`list()`s to refresh.

**Analytics read path:** `AiAnalytics.tsx` loads the same finance stores as every other finance page, then `useFinancialAnalysis()` runs the entire local statistical engine (13 legacy analyzers → 6 synthesis engines, see [AI_ANALYTICS.md](AI_ANALYTICS.md)) synchronously in a `useEffect` against the in-memory data already held by those stores — it never queries Dexie directly, and never leaves the device.

**Sync path** (opt-in): every ~5s, or on the browser `online` event, `SyncProvider` calls `runFullSync(userId)`, which pushes locally-changed rows (`updatedAt` past the last push cursor) and tombstones to one generic Supabase table, then pulls remote changes past the last pull cursor, applying a last-write-wins guard and a malformed-row structural check, then refreshes only the Zustand stores for tables that actually changed. See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) and [SECURITY.md](SECURITY.md).

## Design Principles

- **Local-first, cloud-optional.** The app is fully functional with zero network calls and zero environment configuration. Cloud sync, encryption, and error monitoring all detect their own absence (`isSyncConfigured`, `VITE_SENTRY_DSN` presence) and no-op cleanly rather than requiring setup.
- **UI never touches Dexie directly.** The store → service → repository chain is the only path to persisted data, which is what lets encryption and sync be added as transparent wrapper layers without touching a single page or component.
- **Two escape hatches from the generic factories, used deliberately and sparingly.** `createRepository`/`createCrudService` cover the ~17 repositories and ~14 services with the standard shape; anything with real extra logic (merge, delete guards, the recipient-learning write path, read-only reference data) is hand-written instead of forced into the factory. Both factory files document by name which repositories/services opted out and why.
- **Comments explain why, not what.** Consistently observed across the codebase (see [CODING_STANDARDS.md](CODING_STANDARDS.md)) — non-obvious design decisions get a comment; self-evident code doesn't.
- **Additive-only Dexie migrations.** Every `db.version(n).stores({...})` bump to date either adds a new table or changes an index list without destroying existing data; there has been no destructive schema migration in the app's history (see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)).
- **i18n is a first-class constraint on validation, not an afterthought.** Zod schemas are factory functions taking a `TranslateFn` (`schema(t)`), re-derived per render language via `useMemo`, so switching language re-localizes validation errors without a remount.
- **Rule-based, not LLM-based, for now.** Every "AI" surface in the product (Analytics, Coach, market detection, daily summary) is deterministic local computation. The one seam designed for a real LLM (`src/ai/`) is fully built but deliberately not wired in yet.

## Offline-First Strategy

- **Storage:** IndexedDB via Dexie is the only source of truth on-device; there is no server database that the app depends on to function.
- **Sync as a relay, not a source of truth:** the optional Supabase `synced_records` table exists purely to move changes between a user's own devices — it is never queried directly for display, and the client always reads/writes local Dexie first (see `supabase/schema.sql`'s own header comment).
- **Conflict handling:** last-write-wins per row, compared on a client-embedded `updatedAt` timestamp inside the synced JSON payload (not the Postgres row's own `updated_at`, which is server-clock-authoritative and used only for the pull cursor/ordering — two independent clock-skew mitigations for two independent problems, see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)).
- **Deletion propagation:** tombstone rows (`db.syncTombstones`) record every local delete and are pushed/pulled alongside normal rows so a deletion on one device reaches every other device instead of silently resurrecting.
- **Resilience:** every sync step is individually try/caught so one table's failure never blocks the others; a periodic timer plus an `online` event listener are the only two sync triggers — there is no manual retry queue or offline write log beyond Dexie itself already being durable.
- **PWA:** `vite-plugin-pwa` registers a service worker on the web target only — explicitly skipped inside the Capacitor native WebView, since a fresh APK install already delivers current code and a caching service worker there only risks serving a stale bundle (see `src/main.tsx`).

## Future Backend Architecture

**Not built.** There is no application backend server — Supabase is used only for its hosted Postgres + Auth, accessed directly from the client via `@supabase/supabase-js`, with Postgres Row-Level Security as the only access-control layer (see [SECURITY.md](SECURITY.md)). There are no serverless functions, no API gateway, and no server-side business logic anywhere in this codebase.

If a real backend is introduced in the future, the most natural seam is already in place: `src/features/<name>/services/*.ts` is the one layer every store depends on and every repository is hidden behind — swapping a service's Dexie-repository-backed implementation for an HTTP-API-backed one would not require touching any store, hook, or page. This is the same "future-swap seam" pattern already used deliberately for `src/ai/`'s `FinancialIntelligenceEngine` interface (see [AI_ANALYTICS.md](AI_ANALYTICS.md)) and for `FinancialIntelligenceEngine`/`AIProvider`'s `Promise`-returning methods despite every current implementation being synchronous.

## Current Status

Fully implemented: the entire layered architecture described above, for all 15 feature modules, including the optional sync/encryption wrapper layers. See [MODULES.md](MODULES.md) for per-module status and [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) for known gaps (e.g. no "disable encryption" flow, one orphaned `calendar` module retained only for data-safety reasons).

## Future Improvements

- A real backend/API layer, if multi-user or server-side features are ever required (see "Future Backend Architecture" above).
- Wiring `src/ai/`'s Gateway into a real LLM provider for a genuinely generative (not rule-based) assistant experience, without needing to change any calling code thanks to the existing interface seam.
- A "disable encryption" flow (currently explicitly unbuilt — see `appLockStore.ts`'s own comment, cited in [SECURITY.md](SECURITY.md)).
