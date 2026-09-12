# Mobile/Desktop CRUD and Sync Verification

**Task:** MOBILE-DESKTOP-SYNC-001  
**Date:** 2026-09-12 (Asia/Bangkok)  
**Result:** PASS within the tested scope

> **Physical-device follow-up (2026-09-12):** The deterministic relay test passed because its original update payload retained the complete stored row. A later production Android/desktop check found that real forms omit `syncId`, which caused an edited row to appear as a duplicate on the receiving device. The central repository fix, corrected bidirectional regression coverage, production deployment and passing desktop-to-Android retest are recorded in [LIVE_SYNC_FIX_VERIFICATION_2026-09-12.md](LIVE_SYNC_FIX_VERIFICATION_2026-09-12.md). The reverse physical repetition was unavailable after the phone's USB/ADB connection disappeared.

## Verified behavior

| Scenario | Result | Evidence |
| --- | --- | --- |
| Desktop add, edit and delete | PASS | Production-build Chromium transaction lifecycle |
| Mobile add, edit, reload and delete at 390 × 844 | PASS | Production-build Chromium mobile lifecycle |
| Desktop creates → mobile receives | PASS | Two-device sync-engine scenario using separate local device states and one stateful cloud relay |
| Mobile edits → desktop receives | PASS | Same scenario preserves the shared `syncId` and applies the newer row |
| Desktop deletes → mobile removes | PASS | Tombstone is pushed and the stale mobile copy is removed |
| Mobile creates → desktop receives | PASS | Reverse-direction cycle |
| Desktop edits → mobile receives | PASS | Reverse-direction cycle |
| Mobile deletes → desktop removes | PASS | Reverse-direction tombstone cycle |
| Automatic sync while signed in | PASS | `SyncProvider` test verifies the five-second interval and immediate sync after the `online` event |

## User-visible answer

Changes follow between mobile and desktop when both devices are signed in to the same Nexus account and can reach Supabase. The background provider requests sync every five seconds; **Sync Now** can be used for an immediate attempt. A device that is signed out or running in local-only mode keeps its own independent data and does not update the other device.

For two edits to the same record, the newer `updatedAt` value wins when clocks are comparable. A deletion is terminal for that `syncId`: a stale copy on another device is removed instead of being allowed to recreate the deleted record. Recreating an item intentionally produces a new `syncId`.

## Validation

- Mobile and desktop production-build E2E: 10/10 passed.
- Sync engine, tombstone, auth-store and automatic-provider tests: 63/63 passed.
- TypeScript: passed.
- Oxlint: passed.
- Release build and bundle budget: passed; 3,705.9 KiB total JavaScript, largest chunk 452.4 KiB.
- `git diff --check`: passed for task files.

No application business logic changed. Tests use synthetic transactions. Cross-device behavior was exercised deterministically with two isolated device states and a stateful in-memory Supabase-compatible relay; this run did not create a production account, alter production data, or perform a physical Android-to-PC network test.
