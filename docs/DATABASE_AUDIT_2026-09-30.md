# Database Audit — 2026-09-30

## Scope

Static review of Dexie schema/version declarations, declared tables, owner code references, backup/import, encryption migration, sync table whitelist, SQL schema/migrations inventory and focused DB/backup/sync tests. No live production database was queried and no data was modified.

## Inventory and migration

- Dexie database: `NexusDatabase`; schema version 27, 26 version declarations (v2–v27), 32 table declarations.
- Canonical table inventory and sync classification: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md). All 32 current table declarations are represented there.
- Version 16 drops `slipScannedAssets` in favor of `slipScanCache`; its source comment says it was rebuildable and unreleased. No current user-data destruction was established.
- `calendarEvents` is retired from UI but remains in backup/export/import/clear, sync table list and encryption-migration table list. This is deliberate compatibility handling, though it prolongs maintenance and sync work.
- Generic local persistence is IndexedDB. Supabase SQL schema contains identity-scoped relay records, encryption keys, device pairing, MFA backup/redeem controls, AI Coach usage and weekly digests; it is not a mirrored per-domain relational finance database.

## Integrity mechanisms observed

- Common repositories attach sync metadata and encryption boundaries; deletion propagation uses tombstones.
- Transactions have Smart Import and CSV duplicate/conflict resolution; dedicated transaction duplicate utilities/tests exist.
- Accounts/categories have guarded delete/merge and duplicate merge after sync.
- Snapshots/log tables are used for goal milestones, Net Worth history, budget history, scan cache/candidates and audit history.
- Focused tests passed: `db.test.ts` (1), backup service (24), encrypted repository (15), sync engine (32), sync conflict drill (18); scanner/DB/backup group also passed 96 files / 501 tests.

## Findings

| Finding | Severity | Evidence | Action |
|---|---|---|---|
| No real live DB or cross-account RLS test in this audit | P2 | Tests use fake-indexeddb/mock or local fixtures; no live project queried | Run safe dedicated staging drill with synthetic users before release |
| Calendar compatibility table has no UI but remains in several generic paths | P3 | Backup, encryption migration, sync whitelist references | Preserve until documented retention/export policy and migration exist |
| v16 “drop” wording needs careful qualification | P3 docs | Comment says unreleased/rebuildable; no evidence current live rows were migrated | Keep schema history; clarify this is not a general deletion pattern |
| Relation consistency is not enforced by IndexedDB foreign keys | P2 design boundary | IndexedDB schema uses indexes; relationships are validated by services/merge logic, not FK constraints | Continue service validation; targeted all-relations audit remains open |

## Not established

This static review did not prove all category/account references are valid for every legacy imported row, did not inspect actual user IndexedDB contents/orphans, did not certify every database reset/migration combination, and did not connect to live Supabase. No unique transaction identity constraint exists at the IndexedDB schema level; duplicate protection is application-level, so concurrency/race cases remain a test target.

## Recommended follow-up

1. Add synthetic migration matrix tests for fresh, v15, v16, and current DB upgrade behavior.
2. Add integrity audit utilities/tests for transaction account/category references and import/restore merge boundaries.
3. Keep Calendar records until explicit user-data deprecation policy and backup compatibility plan are approved.
