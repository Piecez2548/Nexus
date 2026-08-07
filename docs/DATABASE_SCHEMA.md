# Database Schema

**Last Updated:** 2026-08-02

## Overview

Nexus's only source of truth is a single Dexie (IndexedDB) database, `NexusDatabase`, defined in `src/database/db.ts`. It is currently at **schema version 14**, reached through 14 strictly additive `db.version(n).stores({...})` calls — no version has ever destroyed or rewritten existing data. An optional Postgres schema (`supabase/schema.sql`) exists purely as a generic sync relay, never queried for display.

## Dexie Database

```ts
class NexusDatabase extends Dexie {
  transactions; accounts; categories; trades; recipientProfiles; merchants;
  budgets; goals; transactionTemplates; todos; habits; holdings;
  calendarEvents; scheduleItems; goalMilestoneEvents;
  syncTombstones; syncState;
}
export const db = new NexusDatabase(); // database name: "NexusDatabase"
```

## IndexedDB Tables

17 tables total. `SyncMeta` = `{syncId?, updatedAt?, deletedAt?}`, mixed into every synced entity by `withSyncMeta()` (`src/utils/syncMeta.ts`) — see [API_INTERFACES.md](API_INTERFACES.md).

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
```

## Indexes

Every table's primary key is Dexie's auto-increment `++id` (device-local, **not** the cross-device identity — see `syncId` below). Beyond `id`, every synced table indexes only `syncId` and `updatedAt` as of v9 — all richer per-field indexes (`title`, `amount`, `category`, `date`, etc.) that existed in v2–v8 were deliberately dropped once encryption made per-field querying impossible for encrypted rows; all filtering/sorting on business fields now happens in-memory in stores/hooks, not via Dexie indexes. Two tables keep one additional **unique** plaintext index each, specifically because encryption never touches these two fields:
- `recipientProfiles`: `&recipientKey` (unique) — used for direct `.where("recipientKey").equals(...)` lookup by `recipientProfileRepository`.
- `budgets`: `&category` (unique) — one budget per category.

`syncTombstones` indexes `table, syncId, deletedAt`. `syncState` is a plain key-value table (`&key` primary key, e.g. per-table push/pull cursors).

## Relationships

Dexie has no foreign-key enforcement — all relationships are informal, held together by application-level fields and guarded in the service layer, not the database layer:

- `Transaction.account` / `Transaction.toAccount` → `Account.name` (string match, not an id reference). `accountService.remove()` refuses to delete an account still referenced by any transaction; `accountService.merge()` reassigns every referencing transaction before deleting the source account.
- `Transaction.category` → `Category.name`. Same guard/merge pattern in `categoryService`.
- `Transaction.recipient` → `RecipientProfile.recipientKey` (derived key, not a stored id) — `recipientProfileService.recordUsage()` upserts a profile on every transaction save that has a recipient.
- `GoalMilestoneEvent.goalSyncId` → `Goal.syncId` (cross-device-stable UUID, not the local `id` — since a milestone event and its goal must still line up correctly after a sync pulls goals with new local ids on another device).
- `Budget.category` → `Category.name`.
- No other cross-table references exist; every other table is independent.

## Repository / Encryption Layer (sits between every table and every feature)

- **`src/database/encryptedRepository.ts`** — `createEncryptedRepository<T>(table, {plaintextKeys?})` wraps a raw Dexie `Table` with transparent encrypt-on-write/decrypt-on-read. When encryption is enabled, every field of a row except `id`/`syncId`/`updatedAt` and any configured `plaintextKeys` is JSON-serialized and AES-GCM-encrypted as one `encryptedContent` envelope (`{v, iv, ct}`). `remove()` is deliberately excluded from this wrapper — deletion only ever needs `syncId`, which is always plaintext.
- **`src/database/createRepository.ts`** — `createRepository<T>(table, tableName, options?)` composes the encryption wrapper with `withSyncMeta()` (stamps `syncId`/`updatedAt`) and `recordTombstone()` (logs a deletion for sync propagation) into the standard `{getAll, add, update, remove, decryptOptional}` shape used by ~12 of the app's repositories.
- **`src/database/createCrudService.ts`** — `createCrudService<T>(repository)` renames that shape to `{list, create, update, remove}`, used by ~9 services.
- Full contracts and the exact list of repositories/services that opt out of these factories are in [API_INTERFACES.md](API_INTERFACES.md) and [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md).

## Seed Data (`src/database/seed.ts`)

Runs once on first launch (count-gated, idempotent), before any sync/encryption is relevant:
- **Accounts** (if none exist): Cash, Bank.
- **Categories** (if none exist): Salary (income) + 11 expense categories (Food, Transport, Shopping, Investment, Education, Health, Entertainment, Utilities, Travel, Insurance, Others).
- **Merchants** (if none exist): 9 Thailand-localized brand → category mappings (Starbucks, MK, 7-Eleven, Shopee, Lazada, Netflix, Spotify, Grab, BTS).

No other table is seeded.

## Backup Format (`src/database/backupService.ts`)

`exportBackup()` produces a plaintext JSON document (`{version: 1, exportedAt, data: {...15 table arrays...}}`) regardless of whether local encryption is enabled — decrypting every row first, since a backup is meant as a portable, human-readable disaster-recovery artifact. `importBackup(json, translate)` validates structure, re-encrypts rows to match the current device's encryption state, then replaces all 15 tables in one Dexie transaction (`clear()` + `bulkAdd()`). See [SECURITY.md](SECURITY.md) for what this means for backup-file sensitivity.

## Future PostgreSQL Schema

**Implemented, but intentionally minimal — not a mirror of the Dexie schema.** `supabase/schema.sql` defines exactly two tables, used only as an opaque relay and an encryption-key escrow, never queried for display:

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
```

One generic `synced_records` row per (entity, table) holds the entity's data as an opaque JSONB blob (encrypted or not, depending on the client's local encryption state) — Postgres itself never has per-entity typed columns for transactions, trades, etc., and there is no plan to add them (see [DECISIONS.md](DECISIONS.md) for why). A true multi-user backend with typed tables and server-side business logic is **not built and not currently planned** — see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)'s "Future Backend Architecture."

## Current Status

Fully implemented through schema v14. All 15 sync-eligible tables + `merchants` are live and in use except `calendarEvents` (orphaned, see above). Encryption and sync are both optional, additive layers on top of this schema, not separate schemas.

## Future Improvements

- Remove the `calendarEvents` table declaration once no user's data in it still needs preserving.
- If a "disable encryption" flow is built (see [SECURITY.md](SECURITY.md)), it will need a new migration path symmetric to `enableEncryption.ts`.
- The `PLAINTEXT_KEYS` mapping (which fields stay unencrypted per table) is currently hand-duplicated in three places (`encryptedRepository` call sites, `backupService.ts`, `enableEncryption.ts`) with no single source of truth — worth consolidating (see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).
