# Database Schema

**Last Updated:** 2026-08-21

## Overview

Nexus's only source of truth is a single Dexie (IndexedDB) database, `NexusDatabase`, defined in `src/database/db.ts`. It is currently at **schema version 27**, reached through 26 `db.version(n).stores({...})` calls. All are additive with one narrow exception: v16 dropped the `slipScannedAssets` table outright (`slipScannedAssets: null`), but per that version's own comment this table was "rebuildable, unreleased" — i.e. never shipped to a real user before being superseded by `slipScanCache` — so no version has ever destroyed or rewritten existing user data. An optional Postgres schema (`supabase/schema.sql`) exists purely as a generic sync relay, never queried for display.

## Dexie Database

```ts
class NexusDatabase extends Dexie {
  transactions; accounts; categories; trades; recipientProfiles; merchants;
  budgets; goals; transactionTemplates; todos; habits; holdings;
  calendarEvents; scheduleItems; goalMilestoneEvents;
  syncTombstones; syncState;
  slipScanRuns; slipScanCache; slipImportHistory;
  vaultEntries; auditLog; workoutExercises; workoutEntries;
  netWorthItems; netWorthSnapshots; subscriptions; budgetPeriodSnapshots;
  slipScanCandidates; strategies; watchlistItems; economicEvents;
}
export const db = new NexusDatabase(); // database name: "NexusDatabase"
```

## IndexedDB Tables

32 tables total. `SyncMeta` = `{syncId?, updatedAt?, deletedAt?}`, mixed into every synced entity by `withSyncMeta()` (`src/utils/syncMeta.ts`) — see [API_INTERFACES.md](API_INTERFACES.md). "Synced?" reflects `SyncTableName` in `src/features/sync/types.ts`, the single source of truth for what the sync engine touches.

| Table | Owning module | Synced? | Notes |
|---|---|---|---|
| `transactions` | finance | ✅ | |
| `accounts` | finance | ✅ | |
| `categories` | finance | ✅ | |
| `trades` | trading | ✅ | |
| `recipientProfiles` | finance | ✅ | `recipientKey` stays plaintext even when encryption is on |
| `merchants` | finance | ❌ | seeded reference data, not personal — excluded from sync by design |
| `budgets` | finance | ✅ | `category` stays plaintext even when encryption is on |
| `goals` | finance | ✅ | |
| `transactionTemplates` | finance | ✅ | Quick Add tiles |
| `todos` | todo | ✅ | |
| `habits` | habits | ✅ | |
| `holdings` | portfolio | ✅ | |
| `calendarEvents` | **orphaned** (`features/calendar/`) | ✅ | table + type kept only so old rows aren't lost; no feature code reads/writes it — see [MODULES.md](MODULES.md), [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) |
| `scheduleItems` | schedule | ✅ | |
| `goalMilestoneEvents` | finance | ✅ | write-once log, no `update` |
| `syncTombstones` | sync (infra) | — | records local deletes for propagation |
| `syncState` | sync (infra) | — | sync cursor bookkeeping, keyed store |
| `slipScanRuns` | finance (`slipScanner`) | ❌ | device-local Gallery Scanner run/checkpoint (resumable scan session) |
| `slipScanCache` | finance (`slipScanner`) | ❌ | device-local production scan cache (assetId/contentHash/status/ocr+payload+parser versions); supersedes v15's dropped `slipScannedAssets` |
| `slipImportHistory` | finance (`slipScanner`) | ❌ | device-local Smart Import run log, powers the Import History view |
| `vaultEntries` | vault | ✅ | **always** encrypted regardless of the device-wide encryption toggle — page-gated on `encryptionEnabled` (`Vault.tsx`); zero plaintext-exempt fields, not even `title` |
| `auditLog` | security | ❌ | device-local, append-only security audit trail (auth/encryption/lock/vault/backup events); bounded at 500 rows |
| `workoutExercises` | workouts | ✅ | exercise catalog (name/category/icon/color/calorie rates) |
| `workoutEntries` | workouts | ✅ | logged sessions; GPS `route` points (if any) stored inline |
| `netWorthItems` | finance (Net Worth, FIN-002) | ✅ | assets/liabilities, one unified model with a `kind` discriminator — no live price feed, manually valued like `holdings` |
| `netWorthSnapshots` | finance (Net Worth, FIN-002) | ✅ | write-once-per-day history log (upserted, not appended); one row per calendar day — see `WorkoutEntry`'s `date`-keyed pattern |
| `subscriptions` | finance (Subscription Manager, FIN-004) | ✅ | independently-managed recurring-payment entity (name/amount/billing frequency/next billing date/status/category/account/note/reminderEnabled/`billingAnchorDay`) — distinct from the pre-existing subscription *detectors*, which only derive a read-only view from transaction history and manage nothing. `billingAnchorDay` (optional, BUG-12) is the true day-of-month billing lands on, persisted separately from `nextBillingDate` so a month-length clamp (Jan 31 -> Feb 28) doesn't permanently lose the original day |
| `budgetPeriodSnapshots` | finance (Budget Improvements, FIN-001) | ✅ | upsert-by-(budgetSyncId, periodStart) history log of each budget's past-period performance — survives the budget's `amount` being edited later, unlike the always-live-recomputed current view |
| `slipScanCandidates` | finance (`slipScanner`, BUG-12 stabilization pass) | ❌ | device-local, persists each extracted slip candidate the moment it's produced during a gallery scan — closes a gap where an interrupted scan (app kill, crash, reload) lost work a resume could never re-extract, since the asset was already marked "scanned" in `slipScanCache`. `thumbnailUrl` is deliberately dropped before persisting (a blob: object URL, meaningless once the document that created it is gone) |
| `strategies` | trading (Strategy Library / Playbook) | ✅ | user-authored playbook entries (entry/exit rules, risk notes) documenting a trading strategy — distinct from `Trade.strategy`, a free-text label on individual trades. No unique-name constraint (names may legitimately repeat) |
| `watchlistItems` | trading (Watchlist) | ✅ | symbols the user is tracking; `targetPrice` is a plain manual number, no live price feed of any kind (same precedent as `holdings`) |
| `economicEvents` | trading (Economic Calendar) | ✅ | trading-relevant events the user logs themselves — no external economic-data API (this app has no paid-API dependency anywhere) |

## Table Schema — version history

```ts
// v2 — initial
transactions: "++id,title,amount,type,category,account,date"
accounts:     "++id,name"
categories:   "++id,name,type"

// v3 — richer transaction fields
transactions: "++id,title,amount,type,category,account,toAccount,date,status,*tags"
accounts:     "++id,name,type"

// v4 — trading
trades: "++id,symbol,market,direction,status,entryDate,strategy,*tags"

// v5 — recipient learning, merchants, budgets, goals
transactions:      "++id,title,amount,type,category,account,toAccount,date,status,recipient,*tags"
recipientProfiles: "++id,&recipientKey,category"
merchants:         "++id,&name,category"
budgets:           "++id,&category,period"
goals:             "++id,name"

// v6 — Quick Add templates
transactionTemplates: "++id,name,type,category,account"

// v7 — todo
todos: "++id,completed,dueDate,priority"

// v8 — sync metadata added to every synced table
// (adds syncId,updatedAt to transactions/accounts/categories/trades/
//  recipientProfiles/budgets/goals/transactionTemplates/todos;
//  adds syncTombstones "++id,table,syncId,deletedAt" and syncState "&key")

// v9 — encryption-at-rest index trim
// Once a row is encrypted its business fields live in one opaque
// `encryptedContent` blob and can no longer be indexed per-field, so
// every per-field index EXCEPT syncId/updatedAt is dropped here — a pure
// index trim, not a data rewrite, safe to ship ahead of the actual
// encryption migration. &recipientKey and &category are kept: those two
// fields deliberately stay plaintext to preserve their unique-index lookups.
transactions:          "++id,syncId,updatedAt"
accounts:              "++id,syncId,updatedAt"
categories:            "++id,syncId,updatedAt"
trades:                "++id,syncId,updatedAt"
recipientProfiles:     "++id,&recipientKey,syncId,updatedAt"
budgets:                "++id,&category,syncId,updatedAt"
goals:                 "++id,syncId,updatedAt"
transactionTemplates:  "++id,syncId,updatedAt"
todos:                 "++id,syncId,updatedAt"

// v10 — habits (additive, new table only)
habits: "++id,syncId,updatedAt"

// v11 — portfolio holdings (additive)
holdings: "++id,syncId,updatedAt"

// v12 — calendar events (additive; feature later retired, table kept — see above)
calendarEvents: "++id,syncId,updatedAt"

// v13 — schedule items (additive)
scheduleItems: "++id,syncId,updatedAt"

// v14 — goal milestone events (additive)
goalMilestoneEvents: "++id,syncId,updatedAt"

// v15 — Gallery Scanner (GS-006): device-local, not synced (no syncId).
// slipScanRuns is the resumable scan session/checkpoint; slipScannedAssets
// powered incremental scan (by assetId) and duplicate prevention (by
// contentHash) but was superseded and dropped in v16 below.
slipScanRuns:      "++id,status,startedAt"
slipScannedAssets: "++id,&assetId,contentHash,runId"   // dropped in v16

// v16 — Gallery Scanner (GS-008): slipScannedAssets (v15, unreleased) is
// superseded by a versioned production scan cache with a richer shape
// (last-modified, status, ocr/payload/parser versions, failure count).
slipScannedAssets: null   // drop — rebuildable, unreleased
slipScanCache:     "++id,&assetId,contentHash,status"

// v17 — slipImportHistory (GS-035): device-local log of Smart Import runs
// (date/source/bank/amount/status/duration/errors) for the Import History
// view. Additive.
slipImportHistory: "++id,importedAt,status,bank"

// v18 — vaultEntries (VAULT-001..004): password manager / secure notes /
// recovery keys, one unified entry shape. Always encrypted (see
// vaultEntryRepository.ts) — no plaintext-indexed fields beyond the
// standard syncId/updatedAt. Additive.
vaultEntries: "++id,syncId,updatedAt"

// v19 — auditLog (SEC-002): persisted, device-local, append-only security
// audit trail (src/features/security/auditLog.ts). Deliberately NOT synced
// (no syncId) — diagnostic/operational data local to this device, like
// slipScanRuns/slipImportHistory above. Additive.
auditLog: "++id,at,type"

// v20 — Workout Tracker (catalog + log, mirrors Category + Transaction
// rather than Habit's single-table shape). workoutEntries indexes `date`
// for cheap "logged on this day" lookups; GPS route points (for
// GPS-tracked entries) live inline on the row, same pattern as
// Habit.completedDates. Additive.
workoutExercises: "++id,syncId,updatedAt"
workoutEntries:   "++id,date,syncId,updatedAt"

// v21 — Net Worth (FIN-002): netWorthItems (assets/liabilities, one unified
// model with a `kind: "asset" | "liability"` discriminator — the same
// "don't duplicate near-identical shapes" call already made for Vault) and
// netWorthSnapshots (a date-keyed history log, one row per calendar day,
// upserted whenever totals change — mirrors goalMilestoneEvents' "log what
// happened, no backfill" shape, but keyed by day instead of write-once).
// Additive.
netWorthItems:     "++id,syncId,updatedAt"
netWorthSnapshots: "++id,date,syncId,updatedAt"

// v22 — Subscription Manager (FIN-004): subscriptions, an independently-
// managed recurring-payment entity (status: active/paused/cancelled;
// billingFrequency reuses the existing RecurringFrequency type). Distinct
// from the pre-existing subscription *detectors* (useSubscriptions.ts,
// behaviorAnalysis.ts's computeSubscriptions()), which only derive a
// read-only summary from transaction history and have no independent
// lifecycle. nextBillingDate is stored as entered and only ever rolled
// forward for display (resolveNextBillingDate(), date-fns-based), never
// rewritten in storage. Additive.
subscriptions: "++id,syncId,updatedAt"

// v23 — Budget Improvements (FIN-001): budgetPeriodSnapshots, an
// upsert-by-(budgetSyncId, periodStart) history log of each budget's
// past-period performance -- mirrors netWorthSnapshots' upsert shape
// (not a write-once log like goalMilestoneEvents), since a period's spend
// can legitimately be recomputed many times before it ends. Additive.
budgetPeriodSnapshots: "++id,syncId,updatedAt"

// v24 — slipScanCandidates (BUG-12 stabilization pass): persists each
// extracted slip candidate as soon as it's produced, mirroring
// slipScanCache's per-asset persistence. Device-local, not synced (no
// syncId), like slipScanRuns/slipScanCache. Additive.
slipScanCandidates: "++id,runId,assetId"

// v25 — Strategy Library / Playbook: user-authored reference entries
// documenting a trading strategy's rules, distinct from Trade.strategy
// (a free-text label on individual trades). No unique-name constraint —
// strategy names may legitimately repeat across variations. Additive.
strategies: "++id,syncId,updatedAt"

// v26 — trading Watchlist: symbols the user is tracking. No live price
// of any kind (this app has no price feed, paid or otherwise — see
// Holdings' own manual-price precedent). Additive.
watchlistItems: "++id,symbol,syncId,updatedAt"

// v27 — trading Economic Calendar: events the user logs themselves (no
// external economic-data API). eventDate indexed for chronological
// "upcoming events" queries, mirroring workoutEntries' date index.
// Additive.
economicEvents: "++id,eventDate,syncId,updatedAt"
```

## Indexes

Every table's primary key is Dexie's auto-increment `++id` (device-local, **not** the cross-device identity — see `syncId` below). Beyond `id`, every synced table indexes only `syncId` and `updatedAt` as of v9 — all richer per-field indexes (`title`, `amount`, `category`, `date`, etc.) that existed in v2–v8 were deliberately dropped once encryption made per-field querying impossible for encrypted rows; all filtering/sorting on business fields now happens in-memory in stores/hooks, not via Dexie indexes. Two tables keep one additional **unique** plaintext index each, specifically because encryption never touches these two fields:
- `recipientProfiles`: `&recipientKey` (unique) — used for direct `.where("recipientKey").equals(...)` lookup by `recipientProfileRepository`.
- `budgets`: `&category` (unique) — one budget per category.

`syncTombstones` indexes `table, syncId, deletedAt`. `syncState` is a plain key-value table (`&key` primary key, e.g. per-table push/pull cursors).

A handful of device-local tables outside the sync/encryption system keep their own small plaintext indexes for lookup/uniqueness reasons unrelated to encryption:
- `slipScanCache`: `&assetId` (unique) — one cache row per gallery image, plus non-unique `contentHash` (duplicate detection) and `status` (retry/skip filtering).
- `slipScanRuns`: `status`, `startedAt` — finding the resumable (running/paused) run.
- `slipImportHistory`: `importedAt`, `status`, `bank` — Import History view filtering.
- `auditLog`: `at`, `type` — Audit Log drawer's search/type-filter.
- `workoutEntries`: `date` — "logged on this day" lookups.
- `netWorthSnapshots`: `date` — finding/upserting today's row.
- `slipScanCandidates`: `runId` (which scan produced it, for resume-time lookup and clearing once resolved), `assetId`.
- `watchlistItems`: `symbol` — non-unique (a symbol could legitimately be re-added after removal); grouping/filtering still happens in-memory like every other small entity list.
- `economicEvents`: `eventDate` — chronological "upcoming events" lookups (Dashboard widget + the calendar page's sort), mirroring `workoutEntries`/`netWorthSnapshots`' own `date` index.

`vaultEntries`, `workoutExercises`, `netWorthItems`, `subscriptions`, `budgetPeriodSnapshots`, and `strategies` index only `id`/`syncId`/`updatedAt` — the standard synced-and-encrypted pattern, no per-field index needed. `netWorthItems.kind` (`"asset" | "liability"`), `subscriptions.status` (`"active" | "paused" | "cancelled"`), and `budgetPeriodSnapshots`' upsert-by-key lookup (`budgetSyncId` + `periodStart`) are all deliberately *not* indexed — each list is small enough that grouping/sorting/matching by those fields happens in-memory in the store/service/page, matching this app's own established convention above (business-field filtering happens in memory, not via Dexie indexes).

## Relationships

Dexie has no foreign-key enforcement — all relationships are informal, held together by application-level fields and guarded in the service layer, not the database layer:

- `Transaction.account` / `Transaction.toAccount` → `Account.name` (string match, not an id reference). `accountService.remove()` refuses to delete an account still referenced by any transaction; `accountService.merge()` reassigns every referencing transaction before deleting the source account.
- `Transaction.category` → `Category.name`. Same guard/merge pattern in `categoryService`.
- `Transaction.recipient` → `RecipientProfile.recipientKey` (derived key, not a stored id) — `recipientProfileService.recordUsage()` upserts a profile on every transaction save that has a recipient.
- `GoalMilestoneEvent.goalSyncId` → `Goal.syncId` (cross-device-stable UUID, not the local `id` — since a milestone event and its goal must still line up correctly after a sync pulls goals with new local ids on another device).
- `Budget.category` → `Category.name`.
- `BudgetPeriodSnapshot.budgetSyncId` → `Budget.syncId` (cross-device-stable UUID, not the local `id` — same pattern as `GoalMilestoneEvent.goalSyncId` above).
- `WorkoutEntry.exerciseName` → `WorkoutExercise.name` (string match, denormalized copy — same pattern as `Transaction.category`, survives the catalog exercise being renamed or deleted later).
- No other cross-table references exist; every other table is independent.

## Repository / Encryption Layer (sits between every table and every feature)

- **`src/database/encryptedRepository.ts`** — `createEncryptedRepository<T>(table, {plaintextKeys?})` wraps a raw Dexie `Table` with transparent encrypt-on-write/decrypt-on-read. When encryption is enabled, every field of a row except `id`/`syncId`/`updatedAt` and any configured `plaintextKeys` is JSON-serialized and AES-GCM-encrypted as one `encryptedContent` envelope (`{v, iv, ct}`). `remove()` is deliberately excluded from this wrapper — deletion only ever needs `syncId`, which is always plaintext.
- **`src/database/createRepository.ts`** — `createRepository<T>(table, tableName, options?)` composes the encryption wrapper with `withSyncMeta()` (stamps `syncId`/`updatedAt`) and `recordTombstone()` (logs a deletion for sync propagation) into the standard `{getAll, add, update, remove, decryptOptional}` shape used by 22 of the app's repositories (including `vaultEntryRepository`, `workoutEntryRepository`, `workoutExerciseRepository`, `netWorthItemRepository`, `netWorthSnapshotRepository`, `subscriptionRepository`, `budgetPeriodSnapshotRepository`, `strategyRepository`, `watchlistRepository`, `economicEventRepository`).
- **`src/database/createCrudService.ts`** — `createCrudService<T>(repository)` renames that shape to `{list, create, update, remove}`, used by 19 services.
- Full contracts and the exact list of repositories/services that opt out of these factories are in [API_INTERFACES.md](API_INTERFACES.md) and [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md).

## Seed Data (`src/database/seed.ts`)

Runs once on first launch (count-gated, idempotent), before any sync/encryption is relevant:
- **Accounts** (if none exist): Cash, Bank.
- **Categories** (if none exist): Salary (income) + 11 expense categories (Food, Transport, Shopping, Investment, Education, Health, Entertainment, Utilities, Travel, Insurance, Others).
- **Merchants** (if none exist): 9 Thailand-localized brand → category mappings (Starbucks, MK, 7-Eleven, Shopee, Lazada, Netflix, Spotify, Grab, BTS).

No other table is seeded.

## Backup Format (`src/database/backupService.ts`)

`exportBackup()` produces a plaintext JSON document (`{version: 1, exportedAt, data: {...25 table arrays...}}`) regardless of whether local encryption is enabled — decrypting every row first, since a backup is meant as a portable, human-readable disaster-recovery artifact. `importBackup(json, translate)` validates structure, re-encrypts rows to match the current device's encryption state, then replaces all 25 tables in one Dexie transaction (`clear()` + `bulkAdd()`); `resetAllData()` clears the same 25 and reseeds. See [SECURITY.md](SECURITY.md) for what this means for backup-file sensitivity.

The 25 tables are: `transactions`, `accounts`, `categories`, `trades`, `recipientProfiles`, `merchants`, `budgets`, `goals`, `transactionTemplates`, `todos`, `habits`, `holdings`, `calendarEvents`, `scheduleItems`, `goalMilestoneEvents`, `vaultEntries`, `workoutExercises`, `workoutEntries`, `netWorthItems`, `netWorthSnapshots`, `subscriptions`, `budgetPeriodSnapshots`, `strategies`, `watchlistItems`, `economicEvents`. (`workoutExercises`/`workoutEntries` were initially missed when the Workout Tracker (v20) shipped, silently excluding them from backup/restore/reset — found and fixed 2026-08-18, the same day `netWorthItems`/`netWorthSnapshots`/`subscriptions`/`budgetPeriodSnapshots` were each added to this list from the start to avoid repeating that exact gap; `strategies`/`watchlistItems`/`economicEvents` followed the same from-the-start discipline when each landed.) This excludes only the device-local operational tables (`syncTombstones`/`syncState`/`slipScanRuns`/`slipScanCache`/`slipImportHistory`/`auditLog`/`slipScanCandidates`), which are diagnostic/bookkeeping/in-progress-scan data, not personal content a backup needs to carry.

## Future PostgreSQL Schema

**Implemented, but intentionally minimal — not a mirror of the Dexie schema.** `supabase/schema.sql` defines five tables — an opaque relay, an encryption-key escrow, a two-factor-authentication backup-code store, an AI Coach rate-limit counter, and a weekly financial digest. The first four are never queried for display; the digest table is the one exception, read directly by the Dashboard's `WeeklyDigestCard`:

```sql
create table public.synced_records (
  id uuid not null,
  table_name text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (id, table_name)
);
-- index (user_id, table_name, updated_at); RLS: owner-only via auth.uid() = user_id
-- BEFORE INSERT/UPDATE trigger forces updated_at = now() server-side,
-- so no client's clock skew can make a write appear "before" another
-- device's already-advanced pull cursor.

create table public.user_encryption_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  wrapped_dek text not null,
  dek_iv text not null,
  escrow_salt text not null,
  escrow_iterations int not null,
  created_at timestamptz not null default now()
);
-- RLS: owner-only. Supabase never sees the plaintext DEK — only its
-- AES-GCM-wrapped form, wrapped/unwrapped entirely client-side.

create table public.mfa_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  salt text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
-- index (user_id); RLS: owner-only. A backup code is a high-entropy random
-- secret (not a human-chosen PIN), so the same salted-SHA-256 approach the
-- App Lock PIN uses (pinHash.ts) is appropriate here too -- verified
-- entirely client-side (fetch this user's unused hashes, hash the entered
-- code, compare), since Nexus has no custom backend to verify server-side.
-- TOTP factor enrollment itself lives in Supabase Auth's own tables
-- (auth.mfa_factors), not here -- this table is only the custom recovery
-- mechanism Supabase's native MFA API doesn't provide on its own.

create table public.ai_coach_daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null default ((now() at time zone 'utc')::date),
  request_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);
-- RLS: owner-only. Written exclusively by supabase/functions/ai-coach's
-- increment_ai_coach_usage() RPC (SECURITY INVOKER -- no more power than
-- the calling user's own RLS grants), which atomically increments and
-- returns the day's count in one statement so concurrent requests from the
-- same user can never race past the daily cap. Never read for display --
-- exists purely so the Edge Function can reject a capped user's request
-- before it ever reaches (and gets billed by) Anthropic.

create table public.automation_weekly_digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  income numeric not null,
  expense numeric not null,
  net numeric not null,
  transaction_count int not null,
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, period_start)
);
-- RLS: owner-only select + update (marking seen) -- no insert/delete
-- policy for the authenticated role at all, since rows are written
-- exclusively by generate_weekly_digests() (SECURITY DEFINER), scheduled
-- weekly via pg_cron. Computed directly from synced_records -- never for
-- an account that has encryption enabled (checked via user_encryption_keys
-- row presence), since the server literally cannot read that account's
-- ciphertext. See docs/DECISIONS.md.
```

One generic `synced_records` row per (entity, table) holds the entity's data as an opaque JSONB blob (encrypted or not, depending on the client's local encryption state) — Postgres itself never has per-entity typed columns for transactions, trades, etc., and there is no plan to add them (see [DECISIONS.md](DECISIONS.md) for why). A true multi-user backend with typed tables and server-side business logic is **not built and not currently planned** — see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)'s "Future Backend Architecture."

## Current Status

Fully implemented through schema v27. All 24 sync-eligible tables + `merchants` + the 7 device-local operational tables (`syncTombstones`, `syncState`, `slipScanRuns`, `slipScanCache`, `slipImportHistory`, `auditLog`, `slipScanCandidates`) are live and in use except `calendarEvents` (orphaned, see above). Encryption and sync are both optional, additive layers on top of this schema, not separate schemas.

## Future Improvements

- Remove the `calendarEvents` table declaration once no user's data in it still needs preserving.
