# Nexus Phase 0.4.1 — Android Scanner Runtime Gap Investigation

**Date:** 2026-10-02  
**Status:** PARTIAL — a confirmed UI-to-permission wiring gap was found; the exact failure stage for the user's physical scan remains unknown.  
**Scope:** Investigation only. No scanner source/test/configuration changes, device setting changes, app data changes, rebuild, install, commit, push, deployment, Bank Connectivity, or Phase 0.5.

## Executive Summary

The physical-device discrepancy is real and the scanner does not expose the expected native gallery-picker flow. On Android the product is designed to query MediaStore directly, not open a gallery picker. More importantly, the only production mount of `GalleryScanFlow` is the global TopBar scanner with `automaticScan={false}`. That manual path starts MediaStore count/enumeration without calling the existing gallery permission `check()` or `request()`. The permission request is inside an automatic-scan effect, but no production call site mounts that effect with automatic scanning enabled. This is a confirmed P1 wiring defect and a strong explanation for the missing permission experience.

That defect is not proven to be the sole reason the user's exhaustive scan failed. A later read-only Package Manager inspection showed Android image permissions granted at inspection time, and the contemporaneous Nexus process log contained no scanner-specific lines. We have no count/page/read/decode/extraction stage telemetry from the user's scan. The failure may therefore continue after permission is corrected.

Additional confirmed product-contract gaps: the full-gallery Android path does not present a picker; retry is performed by starting Scan Gallery again rather than a dedicated Retry control; native Cancel is cooperative and cannot abort an in-flight Capacitor MediaStore/readBytes bridge operation; verified QR candidates are automatically sent to Smart Import (which can write transactions), while OCR candidates open the review drawer. A real whole-gallery test against personal data is unsafe until that automatic-import behavior is explicitly guarded.

The user reports on physical Vivo V2348 / Android 16: basic smoke PASS; expected permission/gallery flow absent or unreachable; exhaustive scan FAIL; date range PASS; cancel/retry FAIL; real slip → candidate/review FAIL. These outcomes are preserved as user evidence. The earliest failed pipeline stage remains UNKNOWN.

## Physical Device Evidence

| Check | Result / qualification |
|---|---|
| Device | Vivo V2348, serial `10AE9R1ZJY001PY`, Android 16 / API 36; physical evidence only |
| Emulator | `emulator-5554` exists but was excluded from this investigation's physical-device evidence |
| APK/package | Current installed `com.nexus.app`, version 1.0 / code 1; installed with data-preserving `adb install -r` in Phase 0.4 |
| Basic Android smoke | PASS — user-reported; earlier Codex launch/root screen also passed |
| Permission/gallery experience | FUNCTION_NOT_PRESENT_OR_NOT_REACHABLE — user report |
| Explicit exhaustive scan | FAIL — user report |
| Date range | PASS — user report; exact timestamp boundary and which date axis was tested are unspecified |
| Cancel + retry | FAIL — user report; exact UI state/failure stage not captured |
| Real slip → candidate/review | FAIL — user report; no per-stage telemetry |
| Android photo permission at later inspection | `READ_MEDIA_IMAGES` and `READ_MEDIA_VISUAL_USER_SELECTED` both `granted=true` in read-only `dumpsys package`; this does not establish their state at the moment of the earlier scan |
| Nexus scanner log evidence | No scanner-related lines found in the current app PID log sample. No scan-time bridge trace was available. Historical logcat also contained unrelated vendor/system errors, excluded here. |
| Data safety | This investigation did not run another scan, access image bytes, write/import candidates, or change device/app data. No transactions were changed. |

## Actual Android Scanner UI

Production entry is the global `Scan Gallery` action in `src/layouts/TopBar.tsx`, present in the app shell rather than a dedicated Finance transaction-page button. The first tap lazy-loads `GalleryScanFlow` with `automaticScan={false}` and `initialOpen`, which opens `BankSelectionPopup`.

On Android the popup's primary action is the native “Scan all gallery” path (`webFolderSelection={!isNativeGalleryAvailable()}`). The component has a hidden `<input type=file>`, but the native branch does not click it. Browser-only selection sets `webkitdirectory`/`directory` and opens the OS/browser file chooser. Therefore:

- Scanner entry: global TopBar → `Scan Gallery` → lazy `GalleryScanFlow` → setup drawer.
- Start button: primary “Scan all gallery” action (`onConfirm([])`); selected-bank action is “Start scan” in advanced options.
- Gallery/file picker: web-only in this component. No Android Photo Picker/camera picker is wired into this full-gallery flow.
- Explicit exhaustive scan: exposed as the native “Scan all gallery” action; calls `scanNativeGallery(false, dateRange, true)`.
- Automatic scan: code exists in `GalleryScanFlow` but its effect only runs when `automaticScan` is true. Current production TopBar passes false; no other production mount was found, so automatic/incremental startup scanning is not currently exposed by app routing.
- Cancel/pause/resume: shown in the progress overlay while the manual scan is running. Cancel invokes the queue's cooperative cancel callback.
- Retry: no dedicated Retry button. After an error the session resets and the user may reopen Scan Gallery and start a new run. Queue-level item retry is internal and bounded.
- Candidate review: `ImportPreview` is reachable for OCR/unverified candidates or restored pending candidates. Verified QR candidates are sent directly to Smart Import and can create transactions without a review drawer.
- Smart Import: wired from scan completion, but Android reachability was not independently verified. It is not a safe no-write review boundary for verified QR candidates.

## Expected Scanner Contract

`docs/SLIP_SCANNER_SYSTEM_FIX_2026-09-30.md` describes explicit scans as non-incremental/exhaustive, automatic startup scans as incremental/QR-prefiltered, browser folder selection, inclusive local-date bounds, and recoverable OCR worker initialization. It does not document an Android picker flow. It also does not document that the only production mount disables the automatic permission-request path, the Android date filter uses MediaStore insertion time, or verified QR results auto-import. Those omissions make the manual runtime expectation ambiguous.

## Documentation vs Runtime Matrix

| Behavior | Classification | Evidence / caveat |
|---|---|---|
| Global Scan Gallery entry | IMPLEMENTED_AND_EXPOSED | `src/layouts/TopBar.tsx` mounts the lazy scanner on tap |
| Native permission query/request | IMPLEMENTED_NOT_EXPOSED on manual path | Permission service/plugin exist, but manual handler skips them; request is only inside automatic effect |
| Android gallery picker | NOT_IMPLEMENTED in the full-gallery path | Android explicitly selects MediaStore enumeration; no Photo Picker call in this flow |
| Web folder/file selection | WEB_ONLY | Hidden input gets directory attributes and opens only in the non-native branch |
| Explicit exhaustive Android scan | IMPLEMENTED_AND_EXPOSED; BROKEN_AT_RUNTIME per user | Handler passes non-incremental + exhaustive flags; physical report says FAIL, but stage unknown |
| Automatic incremental startup scan | IMPLEMENTED_NOT_EXPOSED / unreachable in current production wiring | Effect exists but production TopBar passes `automaticScan={false}`; no other production mount found |
| Date range | IMPLEMENTED_AND_EXPOSED; physical PASS reported | Android query uses `DATE_ADDED`, not image capture/slip date; lower bound is strict `>` at second resolution |
| Pause/resume/cancel controls | IMPLEMENTED_AND_EXPOSED; runtime cancel FAIL reported | Queue cancellation is cooperative; a pending native bridge call is not aborted |
| Dedicated Retry action | NOT_IMPLEMENTED | A new scan can be started after error; no user-facing Retry button exists |
| QR candidate flow | IMPLEMENTED_NOT_EXPOSED as review | Verified QR candidates auto-import; not presented in review first |
| OCR candidate review | IMPLEMENTED_AND_EXPOSED conditionally | `ImportPreview` opens for unverified/OCR candidates; physical generation failed per user |
| Smart Import | IMPLEMENTED_AND_EXPOSED in source; Android unverified | Wired into completion, can write transactions for verified QR candidates |
| Android 16 partial-photo support | ANDROID_ONLY / statically wired | API 34+ permission aliases and limited state are handled; current device showed grants, but actual query scope/result set was not tested |
| OCR worker recovery | IMPLEMENTED_AND_EXPOSED in engine/tests | Prior automated evidence only; does not validate a real Android scan |

## Missing / Unreachable Features

1. The manual scan entry lacks permission check/request and has no in-app permission state or recovery UI. This is the strongest confirmed reason the expected permission flow was not visible.
2. Native gallery-picker selection is not part of the actual full-gallery UX. Android scans the MediaStore library as a whole or by date bounds. The web folder selector is not an Android fallback.
3. The “automatic startup/incremental” path is dormant in current production composition. The only production mount explicitly disables it.
4. No distinct retry control exists; retry means starting a new scan after the prior run settles.
5. No progress/error telemetry exposes count, pages enumerated, bytes read, image decode, QR, OCR, or candidate counts in durable diagnostics.
6. Review is conditional: QR-verified candidates can be auto-imported; only OCR/unverified candidates go to the review drawer.

## Explicit Scan Failure Trace

Expected path:

`TopBar Scan Gallery` → `BankSelectionPopup` → `handleConfirmBanks` → `scan.scanNativeGallery(false, dateRange, true)` → `useFullGalleryScan` → `useGalleryScan` → `useScanStore.start` → `createScanSession` → `NativeMediaProvider.count/enumerate/readBytes` → `GalleryMediaPlugin.count/page/readBytes` → SHA-256/cache → exhaustive QR→OCR extractor → candidate repository → completion handler.

Source findings:

- The action does request a fresh non-incremental scan (`false`) and selects the exhaustive processor (`true`). This bypasses the incremental cursor/cache and uses the full QR+OCR extractor for each enumerated image.
- The Android media provider is a MediaStore query over `Images.Media.EXTERNAL_CONTENT_URI`; `page` is paginated by cursor offset and `readBytes` opens a content URI and returns base64.
- The manual path does not call permission `check()` or `request()` before `count()`. If denied, `count` rejects with `PERMISSION_DENIED`; the setup handler catches and toasts an error. It does not surface an actionable permission recovery UI.
- Current static permissions include `READ_MEDIA_IMAGES` for API 33+, `READ_MEDIA_VISUAL_USER_SELECTED` for API 34+, and legacy storage capped at API 32. `GalleryMediaPlugin` is registered by `MainActivity` under `GalleryPermissions` and provides permission plus MediaStore methods.
- A later package inspection showed Android image permission grants. No scan-time log or result count identifies whether the failed user attempt stopped at provider count/query, enumeration, byte reads, decode, extractor, or result routing.

Therefore the missing permission flow is a confirmed code defect, but the explicit scan's earliest runtime failure stage is **UNKNOWN**. Do not claim MediaStore, URI, Android 16, image decode, QR, or OCR as the confirmed root cause yet.

## Cancel Failure Trace

`ScanControls.onCancel` → `useScanStore.cancel()` → `session.control.cancel()` sets a flag and releases paused workers → concurrent queue checks cancellation before/after pull and before each retry/handler. This is real cooperative cancellation, not a no-op. However, `NativeMediaProvider` calls `count/page/readBytes` through Capacitor and the plugin has no cancellation token/call handle. A pending native query/read cannot be actively interrupted; cancellation is observed when that awaited operation returns. The extraction code checks cancellation at selected pipeline stages, while a currently executing Tesseract call may not be interruptible.

Physical cancellation failure is user-reported, but its exact stage is unknown. Likely investigation branches: whether progress overlay appeared, whether user tapped Cancel while `status=running`, whether a native bridge call was pending, or whether OCR was active. No diagnostic change was made.

## Retry Failure Trace

There is no dedicated Retry control. Queue retries apply to a failing individual asset up to configured attempts; they are not a visible whole-scan retry. A failed scan transitions to error, the component resets scan state and shows a toast, and the global Scan Gallery entry remains available for a fresh attempt. Thus classify “retry” as not present as a named action, but a new-run retry is available in code. User's retry FAIL is physical evidence; the exact UI action/outcome was not captured. Do not conflate absent button with failure to restart without a focused reproduction.

## Real Slip Pipeline Trace

| Stage | Source path | Evidence/status |
|---|---|---|
| MEDIA_ACCESS | Native permission service → `GalleryMediaPlugin` MediaStore count/page | Manual permission gate absent. Later Android grant observed. User flow failed; exact request/query result unknown. |
| IMAGE_DECODE | `readBytes` content URI → base64 bytes → `createImageBitmap` / canvas helpers | No real asset or device decode telemetry. Decoder returns null on unsupported/unreadable image rather than providing a durable stage error. |
| QR | `extractSlipCandidate` QR decoder/parser/recovery | Not observed on physical runtime. |
| OCR | Tesseract worker pool when QR path requires/permits fallback | Worker tests and prior initialization smoke are not physical slip evidence. |
| EXTRACTION | amount/merchant/date/bank parser assembles candidate | No physical candidate payload/stage trace. |
| CANDIDATE | awaited Dexie `scanCandidateRepository.add` inside extraction callback | Source wired; not verified for the user's failed attempt. |
| REVIEW | OCR/unverified results open `ImportPreview`; QR-verified results auto-import | This is a confirmed routing asymmetry; physical review failure reported but candidate count is unknown. |

Earliest failed stage from the provided physical result: **UNKNOWN**. It may be before candidate creation. No real image was pulled or reprocessed during this investigation.

## Android 16 Compatibility Findings

- Android build configuration is target SDK 36 / compile SDK 36, minimum SDK 24.
- Manifest requests modern `READ_MEDIA_IMAGES` and `READ_MEDIA_VISUAL_USER_SELECTED`; the plugin requests both aliases together on API 34+ and treats selected-only access as `limited`.
- The current V2348 reported both permissions granted at the later read-only inspection.
- There is no Photo Picker use in the full-gallery feature. It performs scoped MediaStore enumeration, which can satisfy whole/partial gallery access only when the corresponding runtime permission scope is granted.
- Native image bytes are obtained by `ContentResolver.openInputStream(content://media/...)`, appropriate for MediaStore URIs in principle; on-device read success remains unknown.
- Date filtering uses `MediaStore.DATE_ADDED` (gallery insertion/download time), not `DATE_TAKEN` or the date recognized on the slip. `from` selection is strict `DATE_ADDED > ?`; `to` converts to next local midnight and uses `< ?`. The strict lower edge can exclude an image added exactly at local midnight (second-resolution comparison). The user reports date range works, but did not test that edge or specify whether the UI was intended to mean capture date vs gallery-add date.
- Static configuration alone does not verify runtime behavior on Android 16. Overall compatibility status: **ISSUES_FOUND / runtime not fully verified**.

## Automated Test Coverage Gap

Hundreds of tests validate portable scanner logic and contracts, but do not execute this device stack:

- `NativeMediaProvider.test.ts` mocks `NativeGalleryMedia.count/page/readBytes`; it verifies argument mapping, paging and base64 decode, not the Android plugin or MediaStore.
- `galleryPermissionService.test.ts` tests pure status mapping; it does not mount the actual native plugin on API 36 or assert that the production manual action requests permission.
- `GalleryScanFlow.test.tsx` runs in jsdom. `Capacitor.isNativePlatform()` resolves as web in this test context, so the flow uses `<input type=file>`, synthetic `File`s and fake extractors. It tests candidate/review/import with injected QR/OCR candidates, not native enumeration/permissions/real extraction.
- Orchestrator integration tests use a fake MediaProvider and controlled bytes/extractors. They prove queue semantics, not `ContentResolver`, Android `content://` URIs or WebView decode behavior.
- Image decoder tests stub `createImageBitmap`/canvas; OCR tests mock worker creation/results in most behavioral tests. The prior Tesseract smoke established worker startup/recognize call, not representative slip accuracy in the Android WebView.
- No instrumentation test was found that invokes `GalleryMediaPlugin` on Android, checks permission grant/denial/partial state, enumerates MediaStore, reads an image URI, or verifies Cancel with a delayed native bridge response.

Automated gap count (classified coverage categories): **6** — native plugin integration, permission-to-manual-entry integration, real MediaStore/URI, WebView image decode, OCR-on-device fixture, and end-to-end cancel/retry/review with import safely disabled.

## Root Causes

### Confirmed

- **P1 — Manual scanner permission flow is not wired.** Production opens scanner with automatic scanning disabled; explicit scan starts native provider without permission check/request or recovery UI. This directly explains why the expected permission/gallery flow was not present. The device's later grant means it does not by itself prove why enumeration failed during the user's earlier attempt.
- **P1 — Physical explicit scan and end-to-end candidate/review are failing.** Confirmed as user-reported product outcomes, but the underlying stage is not yet localized.
- **P2 — Android UI/documentation expectation mismatch.** Native uses whole-library MediaStore enumeration; it does not provide gallery/folder selection. Existing docs highlight web folder selection but do not clearly state this Android contract.
- **P2 — Review/import safety mismatch.** Verified QR results auto-import to Smart Import; the flow can create financial transactions before a review screen. This needs a safe diagnostic/test mode before a real personal-gallery regression test.
- **P2 — Cancellation is only cooperative across the bridge.** UI control and queue cancellation exist, but in-flight native work cannot be aborted by this contract; runtime failure is user-reported, precise causality unknown.
- **P3 — No explicit retry button.** Starting a fresh scan again is possible after error, but the user sees no Retry-specific action.
- **P3 — Automatic scan code is dormant in current production wiring.** The only production mount sets `automaticScan=false`.
- **P3 — Date-range semantics are ambiguous.** Android filters gallery insertion date rather than slip/capture date and the lower edge is strict.

### Not established

No confirmed root cause yet for MediaStore query failure after permission grant, zero/partial enumeration, content-URI byte-read failure, unsupported image decode, QR miss, Tesseract failure/timeout, parser miss, Dexie candidate persistence failure, or Android review rendering failure. Current log evidence does not support choosing among them.

## Confirmed Bugs and Severity

| ID | Severity | Finding | Confidence |
|---|---|---|---|
| A41-001 | P1 | Manual explicit Android scanner bypasses permission check/request; no reachable permission recovery experience | Confirmed by production call graph |
| A41-002 | P1 | Explicit Android scan and real-slip candidate/review fail on physical device | User-confirmed outcome; internal failing stage unknown |
| A41-003 | P2 | Verified QR candidate auto-import path can mutate finance data before review | Confirmed by source; runtime behavior not reproduced this pass |
| A41-004 | P2 | No Android picker; configured feature is MediaStore whole-gallery/date-bounded scan | Confirmed by source |
| A41-005 | P2 | Native scan cancellation cannot abort an awaited plugin operation | Confirmed by interface/lifecycle design; user reports cancel failure |
| A41-006 | P2 | Date range is based on gallery-add timestamp and strict lower bound, semantics not explicit | Confirmed in Java query/source |
| A41-007 | P3 | No dedicated Retry button/action; users must restart a new run | Confirmed by rendered UI/source |
| A41-008 | P3 | Automatic startup/incremental scanning is not enabled at any production mount found | Confirmed by source search |

Confirmed P0 = **0**. No data-loss/security-integrity incident observed in this investigation; do not treat the existing automatic import design as proof a duplicate or unintended transaction occurred.

## Documentation Errors / Ambiguities

- `docs/SLIP_SCANNER_SYSTEM_FIX_2026-09-30.md` reports the intended explicit/exhaustive and automatic/incremental behavior but does not disclose that the manual production mount bypasses the permission request path or that no production mount enables automatic scanning.
- It documents browser folder selection but does not plainly contrast Android's MediaStore enumeration with an absent Android gallery picker.
- `docs/SYSTEM_STATUS_REPORT_2026-09-30.md` and `docs/FULL_SYSTEM_AUDIT_2026-09-30.md` predate this physical evidence and should no longer be read as current proof of Android usability.
- `docs/PHASE_0_4_ANDROID_VERIFICATION_2026-10-02.md` has been updated to include user physical outcomes and link this investigation. Other baseline documents were not rewritten in this narrow task.
- Current doc claims about a generic “real slip → candidate/review” path omit QR auto-import versus OCR review behavior; that contract should be clarified.

## Product Ambiguities

1. Should Android scan all accessible MediaStore images, or should the user choose specific images with Android Photo Picker? The current UI says scan all, but the manual checklist expected a gallery selection flow.
2. Should the date range mean image added to this device, image capture date, or date read from the slip?
3. Should a verified QR candidate ever auto-import without a review/confirmation screen? The current scanner is capable of writing transactions as part of scan completion.
4. Is automatic startup scanning a supported product behavior, or should its dormant code/config be removed/documented as planned?

## Recommended Fix Order

1. **A41-F1 (P1):** Wire permission status/request and denied/limited/blocked recovery to the manual Android action. Keep modern scoped permissions; do not broaden to unrestricted storage. Add a production-composition test proving the manual path invokes permission handling before MediaStore.
2. **A41-F2 (P1):** Add stage-specific, privacy-safe diagnostics (permission status, count, page count, read failure category, decode/QR/OCR/candidate totals; no image/QR/bank/amount content) and a bounded reproducible fixture/instrumentation harness. First localize scan failure before engine redesign.
3. **A41-F3 (P1 safety/P2 behavior):** Provide a diagnostic path that holds all candidates for review and disables import/transaction writes. Do not test exhaustive scans against personal gallery until this guard exists or user supplies explicit isolated safe fixture and authorization.
4. **A41-F4 (P2):** Decide native picker versus MediaStore whole-gallery contract, then make UI copy and manual checklist match the decision.
5. **A41-F5 (P2):** Make native cancellation responsive across paging/read/extraction; add deterministic delayed-bridge lifecycle tests and physical verification.
6. **A41-F6 (P2):** Specify date axis/boundaries; add Android plugin tests at midnight, partial-photo access and Android 16 MediaStore.
7. **A41-F7 (P3):** Add a visible retry action only if product behavior calls for it; separately document queue-level automatic retries.
8. **A41-F8 (P3):** Either enable the intended automatic scan through an explicit safe production entry/configuration or mark it Planned/remove stale claims.

No implementation fixes were applied in this investigation.

## Files Inspected

- `AGENTS.md`
- `docs/SLIP_SCANNER_SYSTEM_FIX_2026-09-30.md`
- `docs/SYSTEM_STATUS_REPORT_2026-09-30.md`
- `docs/FULL_SYSTEM_AUDIT_2026-09-30.md`
- `docs/PHASE_0_4_ANDROID_VERIFICATION_2026-10-02.md`
- `src/layouts/TopBar.tsx`; `src/router/router.tsx`; `src/router/lazyPages.ts`; `src/features/finance/pages/Transactions.tsx`
- `src/features/finance/slipScanner/components/GalleryScanFlow.tsx`, `BankSelectionPopup.tsx`, `ScanControls.tsx`, `ScanProgressDashboard.tsx`, `ImportPreview.tsx`
- `src/features/finance/slipScanner/hooks/useFullGalleryScan.ts`, `useGalleryScan.ts`, permission hooks/service/plugin
- `src/features/finance/slipScanner/store/scanStore.ts`, `services/scanSessionService.ts`, `queue/runConcurrentQueue.ts`, `services/slipExtractionProcessor.ts`
- `src/features/finance/slipScanner/gallery/media/NativeMediaProvider.ts`, `nativeGalleryMediaPlugin.ts`, `mediaCursorBoundary.ts`, `pickImages.ts`
- Android `GalleryMediaPlugin.java`, `MainActivity.java`, `AndroidManifest.xml`, `android/app/build.gradle`, `android/variables.gradle`; `capacitor.config.ts`
- Scanner tests: `GalleryScanFlow.test.tsx`, `NativeMediaProvider.test.ts`, `galleryPermissionService.test.ts`, `scanSessionService.test.ts`, `fullPipeline.orchestrated.integration.test.ts`, QR/image/OCR extraction tests

## Commands Executed

- Read the four required docs and `AGENTS.md`.
- `git status --short` (preserved all pre-existing unrelated modifications/deletions; no cleanup/staging).
- `rg` searches for production `GalleryScanFlow`, `galleryPermissionService.check/request`, `scanNativeGallery`, platform/feature-flag branches and scanner test seams.
- Read-only physical-device commands, each explicitly targeted to `10AE9R1ZJY001PY`:
  - `adb -s 10AE9R1ZJY001PY get-state`
  - `adb -s 10AE9R1ZJY001PY shell dumpsys package com.nexus.app` (version/target and photo permission grants)
  - `adb -s 10AE9R1ZJY001PY shell pidof com.nexus.app`
  - `adb -s 10AE9R1ZJY001PY logcat -d --pid <Nexus PID> -v time` with scanner/crash/media/OCR keyword filtering
- `git diff --check` for report edits.

No emulator command was used as physical evidence. No build/test rerun was necessary because this was investigation/documentation-only and no source changed.

## Changes Made

- Source files changed: **0**.
- Test files changed: **0**.
- Configuration files changed: **0**.
- Documentation files changed in this task: **2** — Phase 0.4.1 report created; Phase 0.4 report updated with user's physical outcomes.
- User data modified: **NO**. App data cleared: **NO**. App uninstalled: **NO**.
- Commit/push/deployment: **NOT_PERFORMED**.

## Remaining Manual Verification

Do not run another exhaustive scan against the user's real gallery until a diagnostic path prevents automatic transaction writes. After A41-F1/F2/F3, use an explicit consented test image (or isolated test device/profile), capture per-stage counts and error category, stop before import, and verify permission, enumeration, byte read/decode, QR/OCR, candidate persistence, review, cancellation and fresh-run retry on the physical Android 16 device. The user-reported date PASS should be repeated against a known gallery-added timestamp if the date contract remains DATE_ADDED.

## Status

```text
PHASE_0_4_1_STATUS = PARTIAL
ANDROID_SCANNER_ENTRY = Global TopBar > Scan Gallery > GalleryScanFlow > BankSelectionPopup
GALLERY_FUNCTION = WEB_ONLY (picker); Android uses MediaStore whole-gallery enumeration and manual permission flow is not exposed
EXPLICIT_EXHAUSTIVE_SCAN = BROKEN (physical user report; exact cause/stage unknown)
CANCEL = BROKEN (physical user report); cooperative queue control exists, native operation not abortable
RETRY = NOT_IMPLEMENTED (dedicated button); fresh-run retry exists but user reports retry FAIL
DATE_RANGE = WORKING (user-reported; semantics/boundaries not fully verified)
REAL_SLIP_PIPELINE_FAILURE_STAGE = UNKNOWN
SMART_IMPORT = REACHABLE_IN_SOURCE / ANDROID_NOT_VERIFIED (verified QR may auto-import; OCR candidates use review)
ANDROID_16_COMPATIBILITY = ISSUES_FOUND (manual permission gap; runtime pipeline not localized)
CONFIRMED_P0 = 0
CONFIRMED_P1 = 2 (manual permission wiring; physical scan/candidate-review failure outcome)
CONFIRMED_P2 = 4 (picker contract, auto-import review safety, bridge cancellation limits, date semantics)
CONFIRMED_P3 = 2 (dedicated retry absent, automatic path unreachable)
AUTOMATED_TEST_GAPS = 6 categories
SOURCE_FILES_CHANGED = 0
TEST_FILES_CHANGED = 0
DOCUMENTATION_FILES_CHANGED = 2
USER_DATA_MODIFIED = NO
APP_DATA_CLEARED = NO
APP_UNINSTALLED = NO
COMMIT = NOT_PERFORMED
PUSH = NOT_PERFORMED
DEPLOYMENT = NOT_PERFORMED
NEXT_ACTION = Phase 0.4.2: wire permission flow, add privacy-safe stage diagnostics and a no-import test mode before retesting on Android 16
```
