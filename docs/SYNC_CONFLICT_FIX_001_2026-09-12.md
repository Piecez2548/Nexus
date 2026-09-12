# SYNC-CONFLICT-FIX-001 — stale live upload protection

Date: 2026-09-12 (Asia/Bangkok)

Status: **completed and applied to the linked Supabase production database**.

## Scope

This task fixes only SC-001 from the offline/conflict/outage drill. Two devices can edit the same live record while offline; after either reconnect order, the record with the later canonical `data.updatedAt` must remain in the cloud and both devices must converge to it. SC-002 clock rollback and SC-003 push-cursor advancement remain separate open defects.

## Implementation

The `set_synced_records_updated_at` Postgres trigger now compares the existing and incoming live payload versions during the upsert. If the stored `data.updatedAt` is later, the trigger retains the stored payload. This decision occurs inside the database update, so another write cannot slip between a client preflight read and the upsert.

Terminal tombstones remain authoritative. A stale live payload cannot resurrect a deleted sync ID. The outer `updated_at` remains server-generated so pull cursors stay independent of device clock skew.

The application emits canonical UTC ISO timestamps, for which lexical ordering matches chronological ordering. Equal or missing client versions keep the existing compatibility behavior; a future protocol version should add a deterministic tie-breaker if equal-timestamp concurrent edits need a stronger guarantee.

## Deployment

`20260912220000_reject_stale_live_sync_updates.sql` was applied successfully to linked Supabase project `Nexus`. A post-deployment migration listing shows local and remote version `20260912220000` aligned. The migration changes only the trigger function; it does not rewrite existing records.

## Validation

- Focused conflict drill: **7 passed / 2 expected failures** across 9 scenarios. Both SC-001 reconnect orders are ordinary passing assertions.
- Related sync, transaction-store and encrypted-repository suite: **21 files; 157 passed / 2 expected failures**.
- Configured lint (`npm run lint`, Oxlint): passed.
- TypeScript and release build (`npm run build:release`): passed.
- Bundle budget: 200 JavaScript chunks, 3708.1 KiB total, largest 454.9 KiB.
- Supabase dry run identified exactly one pending migration; the subsequent push applied it successfully and the remote migration list confirmed alignment.

The relay regression models the trigger semantics but does not exercise simultaneous physical devices or a production authenticated data row. No user record was created, modified or deleted for verification.

## Files changed

- `supabase/schema.sql`
- `supabase/migrations/20260912220000_reject_stale_live_sync_updates.sql`
- `src/features/sync/syncConflict.test.ts`
- `src/features/sync/syncEngine.ts` (correctness comments only)
- sync documentation and task registry

## Remaining work

- SC-002 was subsequently implemented under [SYNC-CONFLICT-FIX-002](SYNC_CONFLICT_FIX_002_2026-09-12.md): durable local version allocation prevents clock rollback from hiding a new write behind its push cursor.
- SC-003 was subsequently fixed under [SYNC-CONFLICT-FIX-003](SYNC_CONFLICT_FIX_003_2026-09-12.md), including repair for existing stuck cursors. Physical offline/reconnect verification of the combined fixes remains separate.
