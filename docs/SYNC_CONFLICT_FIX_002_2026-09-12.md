# SYNC-CONFLICT-FIX-002 — clock rollback and local sync versions

Date: 2026-09-12 (Asia/Bangkok)

Status: implemented; deployed to the production website and installed on the connected Android development device.

## Problem and correction

A local edit after device clock rollback previously received an `updatedAt` behind the table's push cursor. It was never uploaded, and pulling the older cloud copy could overwrite it. A same-millisecond edit could also fall behind the pull-side one-millisecond cursor nudge.

`writeLocalSyncRows` now allocates the version at persistence time, after encryption. In one IndexedDB transaction it reads `clock:<table>`, `push:<table>` and the indexed newest stored `updatedAt`, selects a canonical UTC ISO version above those floors and the input version, writes the row(s), and persists the clock. The wall clock remains the starting value when it is later. A failed write rolls back the whole transaction, including the clock.

The existing shared repository opts into this helper through its encryption adapter. The milestone-event repository, encryption/decryption migrations and legacy sync-metadata backfill also use it. Cloud pull and backup restore still preserve their incoming versions. No new database table, schema version or cloud API is required.

This prevents local clock rollback from hiding new writes, including across restarts, empty tables and concurrent IndexedDB connections. It preserves the existing cloud `data.updatedAt` conflict protocol and terminal tombstones. It does not establish a global real-world ordering for independently edited devices with arbitrary clock skew. The separate SC-003 failed-upload cursor bug was subsequently fixed under [SYNC-CONFLICT-FIX-003](SYNC_CONFLICT_FIX_003_2026-09-12.md).

## Regression evidence

Before implementation, three ordinary acceptance tests failed: rollback edit became 100 instead of 130, a new row after rollback never reached the relay, and a same-millisecond edit left cloud amount 100 instead of 150.

After implementation, the original rollback edit reaches both cloud and peer. Additional regressions cover:

- Creation after deleting the last local row with the device clock behind its cursor.
- Same-millisecond update after a completed sync.
- Legacy-row metadata backfill behind a future push cursor.
- Encrypted edit reaching the peer as ciphertext and decrypting to amount 160.
- Newest pulled version and push cursor as independent allocation floors.
- Clock persistence across connection close/reopen with an empty table.
- Twelve concurrent writes through two database connections receiving distinct ordered versions.
- Failed-batch rollback of both data and clock.
- Encryption and decryption migrations exceeding a future push cursor while preserving readable content.

## Files modified

- `src/database/localSyncWrite.ts` and `localSyncWrite.test.ts` (new).
- `src/database/createRepository.ts` and `encryptedRepository.ts`.
- `src/features/finance/repositories/goalMilestoneEventRepository.ts`.
- `src/features/encryption/migration/enableEncryption.ts`, `disableEncryption.ts` and `disableEncryption.test.ts`.
- `src/features/sync/syncEngine.ts` and `syncConflict.test.ts`.
- Architecture/schema documentation, testing guide, technical debt, conflict reports, changelog and task registry.

## Validation and delivery

- Full unit/integration suite: **451 files, 2817 passed / 1 expected failure (SC-003)**. The final related rerun below additionally validates the last legacy-backfill edit.
- Final related suite: **29 files, 211 passed / 1 expected failure (SC-003)**, including the final legacy-backfill change.
- Mobile/desktop transaction browser suite: **10/10 passed**.
- TypeScript, configured lint (`npm run lint`, Oxlint), release build and bundle budget passed. The application has no standalone ESLint setup; no separate ESLint result is claimed.
- Final local bundle: 200 JavaScript chunks, 3708.7 KiB total, largest 454.9 KiB.
- Vercel production deployment: `dpl_9QRJueD4C8zZX6mdF2BGVmYkBWpM`, Ready, aliased to `https://nexus-lemon-eight-32.vercel.app`.
- Deployment URL: `https://nexus-o16ksb4mj-piecez2548s-projects.vercel.app`. Prior deployment `dpl_C16PWvTQ6ScS3xvXsAb91qgYUTVp` remains available for rollback.
- Published allocator asset `createRepository-CDqNGheH.js` contains the clock/push-floor, transactional batch and repository opt-in markers; SHA-256 `d140dfbb02e5287051cb95b0e920dfc272162ab7a577b7ff7a2511475f6bcde7`.
- Published sync asset `syncEngine-5mTInNqe.js` verified; SHA-256 `3b9078eddb5e30368083f22b92ca17accf4479c2b5e6c33f66d722eabe287690`.
- Post-deployment anonymous-gate/shared-theme smoke: **1/1 passed**. The separate performance benchmark was not run concurrently with the full unit suite.
- Android web build, Capacitor sync and Gradle `assembleDebug`: passed. Packaged allocator and sync-engine assets exactly match the final local build.
- APK v2 signature verified with the existing Android debug signer. APK and installed `base.apk` SHA-256 both equal `acd3188c058b3efe8df9ec8db2ecd45d0151cb2fe8904808c8fcc2328c754dc1`.
- `adb install -r` succeeded on vivo V2348. `MainActivity` launched successfully. First-install time remained `2026-07-24 01:35:06`; last update became `2026-09-12 22:23:04`.

The Android artifact is a development/debug build, consistent with the existing device installation. No user records or device clock settings were modified for verification.

## Limits and next task

These tests use synthetic records and a relay, not a physical device clock change against the user's account. The patch prevents new rollback-related omissions; it cannot reconstruct content that an older app already overwrote. Every editing device must receive the client update for its local writes to use the new allocator.

The proposed `SYNC-CONFLICT-FIX-003` follow-up was subsequently implemented; its evidence is in the [SC-003 report](SYNC_CONFLICT_FIX_003_2026-09-12.md). The next planned verification covers the combined fixes on physical desktop/Android devices.
