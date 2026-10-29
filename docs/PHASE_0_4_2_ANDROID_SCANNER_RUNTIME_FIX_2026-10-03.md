# Phase 0.4.2 — Android Scanner Runtime Fix

**Date:** 2026-10-03  
**Scope:** Fix the manual Android gallery scan permission entry, ensure every manual-scan candidate reaches review before import, add an explicit safe-verification transaction-write boundary and privacy-safe stage diagnostics, preserve cancellation/retry/date-range behavior, and validate source/build integration. No physical-device installation, app-data operation, commit, push, deployment, bank connectivity, or Phase 0.5 work was performed.

## Outcome

Source-level remediation and automated validation are complete. The scanner-focused suite passed (99 files / 494 tests); lint, TypeScript/Vite production build, and Capacitor Android sync passed. Full repository regression had one transient failure in `TradingDashboard.integration.test.tsx` while the component still showed its loading state; rerunning that file separately passed all 4 tests. Android `assembleDebug` remains blocked in this execution context by the previously documented Java NIO loopback error. Therefore, a new APK was **not produced or installed**, and physical scanner behavior remains **NOT_RETESTED**.

## Implemented Behavior

- Manual Android scan checks the native media permission, requests it when needed, and does not begin enumeration unless granted. Denied, blocked, unavailable, and native-plugin error states are surfaced to the user.
- Manual scan remains exhaustive (`incremental: false`) and retains its date range. Automatic scan remains incremental (`incremental: true`); the paths are explicitly represented separately.
- All candidates from a manual gallery scan—including verified QR candidates—are persisted to the review queue. They do not silently invoke Smart Import. Transaction creation requires a separate explicit import action from review.
- With `VITE_NEXUS_SCANNER_SAFE_MODE=true`, the `createTransaction` and rollback/delete operations are blocked at the Smart Import dependency/service boundary, even when Smart Import is called directly. Import UI is disabled and explains safe-verification mode. Normal behavior is unchanged when the flag is off.
- Cancellation is checked after extraction and around asynchronous candidate persistence; a result that completes after cancellation is discarded/removed. A subsequent scan can start after a completed, cancelled, or failed session.
- Date-only range behavior was kept intact.
- In-memory/console diagnostics record stage, timestamp, durations/counts, and coarse error category only. They never record source image, URI/path, QR payload, OCR text, merchant, amount, account, or transaction payload. A diagnostics panel exposes the recent bounded event list for troubleshooting.

## Automated Evidence

| Check | Result |
|---|---|
| `npx vitest run src/features/finance/slipScanner --reporter=dot` | PASS — 99 files, 494 tests |
| `npm run lint` | PASS — project script runs Oxlint; no standalone ESLint script is configured |
| `npm run build` | PASS — `tsc -b`, Vite production build, PWA service-worker generation |
| `npx cap sync android` | PASS — assets/plugins synchronized |
| `npm test -- --reporter=dot` | PARTIAL — 465/466 files and 2,921/2,922 tests passed; one TradingDashboard integration assertion observed Loading instead of `0.0%` |
| `npx vitest run src/features/trading/pages/TradingDashboard.integration.test.tsx --reporter=dot` | PASS on immediate isolated rerun — 1 file, 4 tests |
| `android\\gradlew.bat assembleDebug` | BLOCKED — `java.io.IOException: Unable to establish loopback connection`, before task configuration; same execution-context issue documented in Phase 0.4 |
| Physical Vivo V2348 scanner retest | NOT RUN — no new APK produced/installed in this execution |

The full-suite failure is unrelated to the scanner tests and appears timing-sensitive because the failing test passed when isolated. It is recorded rather than hidden; it should be made deterministic separately if it recurs.

## Physical Retest Preparation

Current verified phone: Vivo V2348, Android 16, serial `10AE9R1ZJY001PY`. Preserve the installed app and its data. No emulator result is a substitute for this retest.

The Codex execution context cannot produce the APK due to the loopback failure. Build from a normal Windows PowerShell session in the project directory, keeping safe verification enabled in that session:

```powershell
$env:VITE_NEXUS_SCANNER_SAFE_MODE = 'true'
npm run build
npx cap sync android
Set-Location android
.\gradlew.bat assembleDebug
Set-Location ..
adb -s 10AE9R1ZJY001PY install -r .\android\app\build\outputs\apk\debug\app-debug.apk
```

`install -r` is an in-place update and is specified without data-clear flags. If Package Manager reports signing/version incompatibility or anything requiring uninstall, stop; do not uninstall or clear data. Verify `com.nexus.app` remains installed and the device serial is the physical phone before launch.

Smallest manual scanner checklist, using a consented representative slip and no transaction import:

1. Launch Nexus and open Finance → Scan Gallery. Confirm permission state is explained; grant media access only if Android prompts. If denied, verify scan does not start and retry after granting permission in Android app settings.
2. Start an explicit exhaustive scan using a narrow date range that includes the chosen test image. Confirm the date-only end date is inclusive in the UI and observe enumeration/progress. Do not select Import.
3. Confirm a real Android media selection/scan result is consumed, then inspect the safe scanner diagnostics for stage progression through image access, QR/OCR, candidate creation, and review. Record only stage/count/duration/category, not image or financial content.
4. Confirm the candidate opens in SAFE REVIEW and no transaction is created. Cancel one scan; start a new scan and verify it proceeds. Also exercise a denied permission then allow/retry if permission has not already been granted.
5. Keep safe mode enabled. Attempting Import must be disabled/blocked and must not change transaction count. Do not disable safe mode during this diagnostic retest.

The app should be force-stopped/relaunched only if needed for a normal restart; do not clear storage/data, reset the database, delete a transaction, or uninstall. User interaction is required for Android permission prompts, image/scan selection, cancel, and review visibility; automated tests do not constitute verification of these actions.

## Changed Files

Implementation changes are confined to the finance slip-scanner flow, its tests, and the Vite environment type. New scanner services cover permission gating, diagnostics, scan-mode definitions, and the safe persistence boundary. The full file list is visible in the current working-tree diff; pre-existing unrelated modifications/deletions were preserved.

Documentation added: this report. Phase 0.4 report updated with this follow-up status. Historical Phase 0.4.1 device observations remain intact.

## Safety / Completion

```text
PHASE_0_4_2_SOURCE_FIX = COMPLETE
SCANNER_FOCUSED_TESTS = PASS (99 files / 494 tests)
FULL_REGRESSION = PARTIAL (1 transient TradingDashboard failure; isolated rerun PASS 4/4)
LINT = PASS (Oxlint)
TYPESCRIPT_AND_WEB_BUILD = PASS
CAPACITOR_SYNC_ANDROID = PASS
ANDROID_ASSEMBLE_DEBUG_IN_CODEX_CONTEXT = FAIL (Java loopback startup)
NEW_APK_PRODUCED = NO
PHYSICAL_DEVICE_RETEST = NOT_RUN
DATA_PRESERVATION = PRESERVED (no device/app data operation performed)
UNINSTALL_OR_CLEAR = NOT_PERFORMED
COMMIT = NOT_PERFORMED
PUSH = NOT_PERFORMED
DEPLOYMENT = NOT_PERFORMED
BANK_CONNECTIVITY_OR_PHASE_0_5 = NOT_STARTED
NEXT_ACTION = Build with VITE_NEXUS_SCANNER_SAFE_MODE=true in normal Windows PowerShell, then perform the listed consented V2348 manual retest
```
