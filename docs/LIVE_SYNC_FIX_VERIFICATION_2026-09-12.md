# Live Mobile/Desktop Transaction Sync Fix

**Task:** LIVE-SYNC-001  
**Date:** 2026-09-12 (Asia/Bangkok)  
**Status:** Completed with a recorded physical-device limitation

## Physical-device finding

The production web app and the installed Android app were signed in to the same Nexus account with encrypted data unlocked. Both started from the same 32-transaction baseline.

| Scenario before the fix | Result |
| --- | --- |
| Desktop creates → Android receives | PASS |
| Android creates → desktop receives | PASS |
| Desktop edits → Android receives | FAIL: Android retained the old row and added the edited row |
| Android edits → desktop receives | FAIL: desktop retained the old row and added the edited row |

All synthetic `LIVE-SYNC-*` records created during this check were removed from both devices. Each device returned to the 32-transaction baseline.

## Post-fix production result

The corrected build was deployed to production as `dpl_34vm47r1KBtJcwRjDriovsHEp3Cm` and aliased to `https://nexus-lemon-eight-32.vercel.app`. The rebuilt APK was installed on Android with `adb install -r`, preserving existing application data.

| Post-fix scenario | Result |
| --- | --- |
| Desktop creates ฿1 → Android receives | PASS: Android totals changed from the baseline expense ฿3,101.28 to ฿3,102.28 |
| Desktop edits the same row from ฿1 to ฿3 → Android receives | PASS: Android totals converged to ฿3,104.28, exactly baseline + ฿3; the former ฿1 value was not retained as a duplicate |
| Android form-shaped edit → desktop receives | PASS in the corrected stateful two-device regression, with an exact one-row assertion |
| Android physical edit → desktop receives | Not repeated post-fix because the Android USB/ADB connection disappeared and Windows no longer enumerated the phone |

The production desktop test row was deleted and the desktop returned to 32 transactions. Its cloud tombstone will remove the Android copy at the next sync; physical confirmation of the Android cleanup was unavailable after the USB disconnect.

## Root cause and fix

Transaction forms submit business fields without sync metadata. `createRepository.update()` previously passed that form payload directly to `withSyncMeta()`, which generated a new `syncId`. The local row was updated in place, but cloud sync treated its new identity as a second record on the receiving device.

The shared repository now reads the stored row before an update and preserves its existing `syncId`. This fixes the identity boundary for every repository that uses the shared implementation while retaining the normal timestamp refresh. Newly created records still receive a new `syncId`.

## Regression coverage

- The transaction-store integration test updates a row with a form-shaped payload and proves that `syncId` remains stable while `updatedAt` advances.
- The stateful two-device sync scenario now performs both desktop and mobile edits with form-shaped payloads and asserts that the receiving device has exactly one row.

## Validation completed

- Targeted repository, transaction-store and sync-engine suite: 46/46 passed.
- Broader sync and transaction-store suite: 152/152 passed across 21 files.
- TypeScript: passed.
- Oxlint: passed.
- Release build and bundle budget: passed; 3,705.9 KiB total JavaScript, largest chunk 452.4 KiB.
- Transaction and mobile production-build Playwright suite: 10/10 passed.
- Android Capacitor build: passed; debug APK produced at `android/app/build/outputs/apk/debug/app-debug.apk`.
- Production deployment: Ready; `dpl_34vm47r1KBtJcwRjDriovsHEp3Cm` is aliased to the public Nexus URL.
- Post-deployment production smoke: 2/2 passed, including anonymous security gates and the mobile cold-login budget.
- Physical desktop create and edit propagation to the installed Android build: passed without an edit duplicate.
- Full unconstrained Vitest run was stopped after it stalled for more than five minutes with a jsdom navigation warning. The bounded relevant suites above passed; the repository's documented stable full-suite command remains `npx vitest run --maxWorkers=4`.

## Acceptance conclusion

The production defect is fixed. The shared repository preserves row identity for form-shaped updates, automated two-device coverage proves one-row convergence in both directions, and the formerly failing desktop-to-Android path now passes on the production web and installed APK. The final Android-to-desktop physical repetition and Android-side cleanup count remain an acceptance limitation caused by loss of the USB/ADB connection; they are not represented as physically verified.
