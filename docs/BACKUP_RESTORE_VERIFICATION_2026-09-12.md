# Backup and Restore Verification

**Task:** BACKUP-RESTORE-001  
**Date:** 2026-09-12 (Asia/Bangkok)  
**Result:** PASS

## Scope

This drill verifies the portable Nexus JSON backup lifecycle without reading or changing production data. It uses one synthetic marker row in each of the 25 user-content tables.

The device-local operational tables (`syncTombstones`, `syncState`, scanner run/cache/history/candidates and `auditLog`) are intentionally outside the portable backup contract.

## Drill sequence

1. Enable encryption with an in-memory synthetic DEK.
2. Import a versioned synthetic backup containing one row in every user-content table.
3. Verify all 24 synced content rows are encrypted at rest and their marker values are absent from plaintext storage. `merchants`, the bundled local reference table, remains plaintext by design.
4. Export the database and verify that the portable JSON contains all 25 expected content-table keys.
5. Clear all 25 content tables and verify every count is zero.
6. Import the exported JSON while encryption remains enabled.
7. Export again and compare the complete `data` object byte-for-value at the parsed JSON level.
8. Verify every content table contains exactly one restored row.

The synthetic rows also carry stable IDs, `syncId` values, timestamps and a shared relationship marker. Exact object equality after restore proves these identity and relationship fields were retained.

## Results

| Check | Result |
| --- | --- |
| Backup schema covers every user-content table | PASS — 25/25 |
| Synced rows encrypted at rest before export | PASS — 24/24 |
| Export is portable plaintext JSON | PASS |
| Simulated total content loss | PASS — 25/25 tables reached zero rows |
| Restore row counts | PASS — 25/25 tables restored one row |
| Complete value and relationship equality | PASS |
| Existing malformed/oversized/version/date/row-limit rejection coverage | PASS |
| Existing legacy-backup compatibility coverage | PASS |

## Validation

- `npx vitest run src/database/backupService.test.ts`: 24/24 passed.
- TypeScript (`npx tsc -b --pretty false`): passed.
- Oxlint (`npm run lint`): passed.
- Release build and bundle budget (`npm run build:release`): passed; 200 JavaScript chunks, 3,705.9 KiB total, largest 452.4 KiB.
- `git diff --check`: passed for task files.

## Implementation note

No backup production logic changed. The task added the complete encrypted disaster-recovery drill and corrected test isolation by clearing `scheduleItems` in `beforeEach`, matching the other content tables.

This result verifies application-level backup integrity in the automated IndexedDB environment. It does not claim recovery time objectives, operating-system file/share behavior, cloud-provider disaster recovery or a physical Android restore exercise.
