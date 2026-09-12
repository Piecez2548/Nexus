# SYNC-CONFLICT-FIX-003 — retry skipped uploads

Date: 2026-09-12 (Asia/Bangkok)

Status: implemented and deployed to the production website; verified debug APK installed on the connected Android device.

## Problem and correction

After a failed upload, pull could fetch an old copy of that same record alongside a newer unrelated record. The old copy was correctly rejected, but its ID was still excluded from the pending-row check. The push cursor advanced beyond the unsent local version, preventing healthy retries from uploading it.

`pullTable` now records the exact versions successfully applied to local storage. Its pending-row check excludes a row only when its current local version equals that applied version. Rejected stale or malformed payloads do not count as acknowledgements. An edit made after a row was applied remains pending even when it has the same sync ID.

The pending-version query and push-cursor update run in one transaction across the entity table and `syncState`, serializing them with the SC-002 local writer. No network operation occurs inside that transaction.

## Existing-install repair

The existing one-time push-cursor repair now uses `migration:clearedPushCursors:v2`. It atomically clears per-table push cursors and records completion, including on installations that already ran v1. The next push reconsiders still-present local records. The deployed server live-version guard and terminal tombstones protect newer cloud data and deletions during replay. Clock and pull-cursor keys are preserved.

This can deliver a skipped edit that still exists locally. It cannot reconstruct content that a previous client already overwrote or deleted.

## Regression evidence

Four pre-fix regressions failed: the original failed-upload cursor cap, malformed same-ID data, a local edit during pull, and an existing installation with the v1 repair flag. The malformed-row test initially surfaced a null dereference while reading its still-unrepaired cloud payload; its assertion now checks the absent value safely.

The conflict drill now passes **17/17**, with no expected-failure markers. Coverage includes repeated upload failure then successful retry and peer convergence, encrypted retry with decryptable peer content, malformed data, a local edit between applied remote rows, and one-time repair after v1. Earlier SC-001, SC-002 and deletion tests remain ordinary passing assertions.

## Files modified

- `src/features/sync/syncEngine.ts`: applied-version bookkeeping, transactional cursor advancement and v2 repair.
- `src/features/sync/syncConflict.test.ts`: ordinary SC-003 acceptance and additional regressions.
- Conflict reports, architecture/schema notes, testing guide, technical debt, roadmap, changelog and task registry.

## Validation and deployment

- Conflict drill: **17/17 passed**, all ordinary acceptance tests.
- Related sync/auth, local version allocation, encrypted repository, encryption migration, finance repository and transaction-store suite: **30 files, 221/221 passed**.
- Desktop/mobile CRUD browser regressions: **10/10 passed**.
- TypeScript, configured lint (`npm run lint`, Oxlint), release build and bundle budget passed. No standalone application ESLint result is claimed.
- Local release budget: 200 JavaScript chunks, 3708.8 KiB total, largest 454.9 KiB.
- Production deployment `dpl_HfyjCfwCekpnuyTX4wK7CrtkTGMK` is Ready and aliased to `https://nexus-lemon-eight-32.vercel.app`; deployment URL `https://nexus-ecg5cu6jq-piecez2548s-projects.vercel.app`. Previous deployment `dpl_9QRJueD4C8zZX6mdF2BGVmYkBWpM` remains available for rollback.
- Published `syncEngine-C9lS1vsq.js` contains the v2 repair and exact applied-version comparison. SHA-256: `641d330a67776c7cb59cfdb3f32228ea95a25bcf28f53a209ef69ec6bcedc4ab`.
- Post-deployment production smoke: **2/2 passed**, covering anonymous gates/shared theme and the mobile cold-login performance threshold.
- Android build/Capacitor sync/Gradle passed. The packaged sync asset matches the copied production build and includes v2 repair. APK signature v2 verified with the existing debug certificate.
- Built APK and installed `base.apk` both have SHA-256 `79191ab2b40f4bdaf0944c013f3d18cc7c83568cfb4f5ee25e9c2683cb1fa90e`.
- In-place installation on vivo V2348 succeeded; MainActivity launched. First-install time stayed `2026-07-24 01:35:06`; last update advanced to `2026-09-12 22:40:12`.

The full 451-file suite result recorded under SC-002 is historical. This task reran the affected groups above rather than claiming a new full-suite run.

## Limits and next task

Conflict tests use isolated IndexedDB device snapshots and a stateful synthetic relay. They do not simulate physical radios or assert conflict ordering for arbitrary equal timestamps on independently edited devices. No real user record is created for verification.

Next proposed task: `SYNC-LIVE-VERIFY-001`, a physical desktop/Android offline-reconnect verification of the three fixes using identifiable temporary records and both sync directions. Recommended model: Astra. This verification is separate from implementing SC-003.
