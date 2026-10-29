# Phase 0.4 — Android Build & Physical Device Verification

**Date:** 2026-10-02

**Scope:** Inventory Android tooling, run the documented web → Capacitor sync → Android debug build path, diagnose the historical Gradle loopback failure, and run relevant automated regression. A continuation records the successful host build supplied by the user, updates the APK on the authorized physical phone without clearing data, and verifies launch/root entry. No source/configuration change, deployment, commit, or push was performed.

## Executive Summary

Phase 0.4 is **PARTIAL**. The web production build, Capacitor sync, Android plugin discovery, focused route/ScreenTutor/scanner tests, and lint all passed. The debug build succeeded when the user ran the Gradle wrapper in normal Windows PowerShell outside Codex; the resulting current APK is present and its metadata was independently inspected. Gradle still fails in the Codex execution context with `java.io.IOException: Unable to establish loopback connection`, but the successful host build means current evidence does **not indicate a Nexus Android project/build defect**. The authorized physical Vivo V2348 is connected; a separate emulator is online but excluded from physical-device evidence. The current APK was installed using a data-preserving update, Nexus All root entry was visually verified, and scanner/navigation interactions remain unverified pending manual input.

The stack trace localizes the failure to Java NIO `Selector.open()` → `WEPollSelectorImpl` → `PipeImpl`, where an AF_UNIX/Unix-domain socket `connect` returns `Invalid argument`. Standalone Java `Selector.open()` reproduced the same failure on installed JDK 17, 21, and 24; TCP binds to both `127.0.0.1` and `::1` passed, and using a different temporary directory did not resolve it. This establishes an execution-environment Java NIO loopback IPC failure, but does not identify which Windows policy/security/sandbox layer causes it. No system setting was changed.

## Environment

| Item | Observed |
|---|---|
| OS | Windows 11 Home Single Language, 10.0.26200, 64-bit |
| Node / npm | Node v22.22.3 / npm 10.9.8 |
| Java | Eclipse Temurin 21.0.12.1 LTS; `JAVA_HOME` points to this JDK |
| Additional Java runtimes | Temurin 17.0.20.1 and Oracle/OpenJDK 24.0.1 are installed; Java NIO selector test fails on all three |
| Gradle | Wrapper 8.14.3; daemon JVM is Java 21.0.12.1 |
| Android Gradle Plugin | 8.13.0 (`android/build.gradle`) |
| Capacitor | CLI 8.4.2; `@capacitor/android` 8.4.2 |
| Android SDK | `D:\android-sdk` from `android/local.properties`; Java Properties parsing resolves the path correctly |
| SDK platforms / build tools | Platform `android-36`; build-tools `35.0.0`, `36.0.0` |
| ADB | Available, platform-tools 37.0.1 |
| Connected ADB targets (continuation check) | Physical handset `10AE9R1ZJY001PY`: `device`, Vivo V2348, Android 16/API 36. `emulator-5554`: `device` (virtual target, x86_64 ABI; not physical-device evidence). |
| Android project status | No tracked Android source/config changes from this phase; Capacitor-generated web assets are ignored by Git |
| App identity / SDK range | `com.nexus.app`, Nexus; min SDK 24, compile/target SDK 36 |

`TEMP`/`TMP` point to the normal Windows user temp folder; `TMPDIR`, `GRADLE_OPTS`, `JAVA_TOOL_OPTIONS`, and proxy environment variables were unset at initial inspection. Project and user Gradle properties contain no `org.gradle.jvmargs` override. Gradle reported no running daemons; two stopped daemon records were listed. No live Java/Gradle process remained after the failed build. Windows localhost resolves to `::1` and `127.0.0.1`; Windows hosts has no explicit active localhost override. TCP listener binds on both addresses succeeded. TCP dynamic port range is 1024–15000; no evidence of port exhaustion was found in the sampled connection state.

Windows Firewall profiles observed: Domain enabled, Private disabled, Public enabled. Microsoft Defender service, antivirus, and real-time protection were enabled. These checks do not establish that either firewall or antivirus caused the failure; neither was disabled or modified. No machine-wide configuration was changed.

## Historical Blocker

The prior scanner report recorded Gradle failing before task configuration with `java.io.IOException: Unable to establish loopback connection`. Earlier attempts documented there with no-daemon, IPv4 preference, and empty Gradle JVM arguments also failed. This phase started again with the normal project workflow and did not begin with those workaround flags.

## Gradle Reproduction Result

- `gradlew.bat --version`: PASS — Gradle 8.14.3 starts on Java 21.0.12.1.
- Normal `gradlew.bat assembleDebug`: **FAIL**, exit 1, before project task configuration:

```text
Starting a Gradle Daemon, 2 incompatible Daemons could not be reused, use --status for details

FAILURE: Build failed with an exception.

* What went wrong:
java.io.IOException: Unable to establish loopback connection
```

- Diagnostic retry `gradlew.bat assembleDebug --stacktrace`: same failure. The causal stack includes `WEPollSelectorImpl`, `PipeImpl$Initializer$LoopbackConnector`, and `java.net.SocketException: Invalid argument: connect` from `UnixDomainSockets.connect0`.
- Standalone Java `Selector.open()` reproduced the same exception on JDK 17.0.20.1, 21.0.12.1, and 24.0.1. IPv4/IPv6 TCP binds succeeded. A process-local test using `C:\Windows\Temp` as `java.io.tmpdir` still failed; the environment variable was restored immediately. This narrows the issue to Java NIO's internal AF_UNIX wakeup-pipe path in this execution environment; it is not proof of a Gradle project or TCP localhost defect.
- **Normal Windows host PowerShell (user-run continuation): PASS.** The user ran `Set-Location 'D:\Project_001\Nexus-Project\Nexus\android'` followed by `.\gradlew.bat assembleDebug`. Supplied output: `BUILD SUCCESSFUL in 1m 29s`; `369 actionable tasks: 27 executed, 342 up-to-date`. The current APK path/timestamp/package were then checked locally (see APK Evidence). The raw host terminal log was not captured in this task; the successful output is user-provided evidence corroborated by the fresh APK artifact.
- Gradle daemon status after failure: no running daemon. Two stopped daemon records were shown; no daemon was force-stopped.
- Host success alongside the Codex-only failure makes the issue execution-context-specific in current evidence. The exact Codex/Windows mechanism remains **UNRESOLVED**. Firewall/antivirus, sandboxing, and other OS policy were not altered to test a hypothesis.

## Root Cause if Found

**Classification updated from continuation evidence:**

- Nexus Android project build: **VERIFIED WORKING** by the user-run normal Windows PowerShell build and the resulting current APK artifact.
- Normal Windows host Gradle execution: **PASS** (user-provided successful output; APK metadata corroborates it).
- Codex execution context: **FAIL** at Java NIO `Selector`/AF_UNIX loopback startup.
- Repository Android build defect: **NOT INDICATED** by current evidence.
- Exact cause of the Codex-context AF_UNIX failure: **UNRESOLVED**; no specific sandbox/policy root cause is claimed.

## Changes Made

- Source files changed: **0**.
- Test files changed: **0**.
- Configuration files changed: **0**.
- Documentation files changed: **2** — this report and one current-status link in `docs/README.md`.
- No files under `xauusd-ai-trader/` or `xauusd-pair-detector/` were read or modified in this phase beyond their appearance in the preserved pre-existing Git status.
- No Gradle/JDK/SDK/firewall/antivirus/device setting was persistently changed.

## Capacitor Sync Result

**PASS.** `npx cap sync android` completed successfully after the production web build. It copied assets/configuration and synchronized native plugin metadata. `npx cap ls` found nine Android plugins:

- `@capacitor/app` 8.1.1
- `@capacitor/browser` 8.0.4
- `@capacitor/camera` 8.2.2
- `@capacitor/filesystem` 8.1.2
- `@capacitor/geolocation` 8.2.2
- `@capacitor/haptics` 8.0.2
- `@capacitor/local-notifications` 8.2.2
- `@capacitor/share` 8.0.1
- `@capgo/capacitor-native-biometric` 8.6.2

Capacitor sync is not an APK build and is not counted as Android compilation evidence.

The nine-item `npx cap ls` result covers the installed Capacitor packages. The project-specific `GalleryMediaPlugin`, `PaymentNotificationCapturePlugin`, and `AppSettingsPlugin` are registered manually in `android/app/src/main/java/com/nexus/app/MainActivity.java`; the gallery plugin is the app's MediaStore/permission bridge. This confirms their source registration, not that the Java classes compiled into a current APK or ran on-device.

## Android Build Result

**PASS on the normal Windows host; FAIL only in the Codex execution context.** The host run completed successfully as recorded above. The in-Codex attempt still fails before project task configuration due to Java NIO loopback. This distinction is important: the former is the successful project build gate; the latter does not establish a repository build defect. No speculative Gradle/JVM/firewall/antivirus change or rebuild was performed after the user supplied the successful result.

## APK Evidence

The host build produced the current APK at `D:\Project_001\Nexus-Project\Nexus\android\app\build\outputs\apk\debug\app-debug.apk`.

- Size: **21,632,472 bytes**.
- Modified: **2026-10-02 22:45:26 +07:00** (2026-10-02 15:45:26 UTC).
- SHA-256: `B3C206AE712456520F6D40F0D40884F3199C7379A49FCEE04E71924642526342`.
- `aapt` metadata: package `com.nexus.app`, label `Nexus`, version 1.0 (versionCode 1), compile SDK 36, target SDK 36.
- The timestamp matches the successful host build date and the package matches this project; together with the user's successful host build output this is counted as the **current build artifact**. The raw host terminal log was not captured in this task.

The earlier **2026-09-15** APK (21,630,820 bytes) was historical only and has been superseded by the newer file. It was not installed.

## Connected Device

The first continuation check showed the phone as `unauthorized`; after ADB was restarted by the user, the latest authorized state is:

- Physical serial `10AE9R1ZJY001PY`: **device**, manufacturer Vivo, model `V2348`, Android 16 / API 36.
- `emulator-5554`: also `device`, but it is an emulator and is explicitly excluded from physical-device evidence.

Every device-specific command in this continuation explicitly targeted `10AE9R1ZJY001PY`.

## Installation Result

**PASS.** Before installing, the physical phone had `com.nexus.app` version 1.0 / versionCode 1 installed. Its first-install time was `2026-07-24 01:35:06`, last update `2026-09-15 22:59:45`, package path under `/data/app`, and APK signing certificate matched the current APK (SHA-256 `3169d59782923a0ca52ed1e2a19a7148133f9b0db7ef7d66f645b46bc7ae4a3b`).

Installed the specified current APK using `adb -s 10AE9R1ZJY001PY install -r ...`; Package Manager returned **`Success`**. The existing app's `firstInstallTime` remained unchanged while `lastUpdateTime` advanced to `2026-10-02 23:06:25`; package/version/signing identity remain `com.nexus.app` 1.0/code 1 with the matching debug signer. This was an in-place replace/update; no uninstall, data-clear, storage-clear, or database-reset command was issued. **DATA_PRESERVATION = PRESERVED.** ADB still reports the physical phone as `device` after installation.

## Launch Result

**PASS.** On the physical phone, `adb -s 10AE9R1ZJY001PY shell am start -W -n com.nexus.app/.MainActivity` returned `Status: ok`, `LaunchState: WARM`, and `Complete`. `dumpsys activity` showed `com.nexus.app/.MainActivity` as the resumed and focused activity; process PID was 26578. No immediate crash was observed.

## Product Entry Verification

**PASS on physical device.** A captured, visually inspected screen after the root launch showed the Nexus-branded workspace landing/chooser (Thai workspace heading and “choose workspace” action), which is the Nexus All primary entry. The screenshot also contained a signed-in account label, so it is not embedded or copied into project documentation.

## Smoke Test Results

**PASS (user-reported physical-device result).** The user subsequently completed the basic Android smoke test on the physical Vivo V2348 and reported PASS. The earlier Codex-observed evidence in this report independently confirms only app startup and Nexus All root rendering; the user's navigation/back/resume substeps were not separately captured here.

## Slip Scanner Runtime Results

The user has now manually exercised the current APK on the physical Android 16 phone. Results below supersede the earlier NOT_TESTED values for those actions. These are user observations, not Codex-reproduced scan traces:

- Permission/gallery flow: **FUNCTION_NOT_PRESENT_OR_NOT_REACHABLE** (user could not find the expected flow).
- Explicit exhaustive scan: **FAIL** (user report).
- Date range UI/behavior: **PASS** (user report; no boundary fixture/details supplied).
- Cancel and retry: **FAIL** (user report; exact failure stage/button not separately captured).
- Real slip → candidate/review: **FAIL** (user report; no stage telemetry supplied).
- Basic Android smoke test: **PASS** (user report).
- Automatic incremental scan, exact permission grant at the moment of scan, provider enumeration counts, image decode, QR/OCR, candidate persistence, and Smart Import: **NOT_VERIFIED**.

No finance data was touched or created.

## Permission Results

**Partial evidence.** Static Android manifest declares `READ_MEDIA_IMAGES`, `READ_MEDIA_VISUAL_USER_SELECTED`, and legacy `READ_EXTERNAL_STORAGE` capped at API 32. A read-only `dumpsys package com.nexus.app` inspection after the user's testing showed `READ_MEDIA_IMAGES` and `READ_MEDIA_VISUAL_USER_SELECTED` granted on the physical device. This does not prove what permission state existed when the failed scan was attempted. Code inspection found the manual TopBar scanner path does not check/request permission before invoking the MediaStore scan; see the Phase 0.4.1 gap report.

## Date Boundary Results

**NOT_TESTED on Android runtime.** Existing automated scanner tests cover local date-bound semantics; see Automated Regression Results. They do not establish behavior through the Android media provider.

## Cancellation/Retry Results

**NOT_TESTED on Android runtime.** Automated scanner regression passed; real scan cancellation/retry through the Android gallery/provider remains outstanding.

## Real Gallery Result

**FAIL / flow not reachable as expected (user report).** No system image picker is exposed for native gallery scans: Android's configured path enumerates MediaStore after the user chooses Scan All. The manual scan path also lacks an explicit permission check/request. Current permission state is granted, but no prior-run provider evidence is available.

## Real Slip Result

**FAIL (user-reported end-to-end outcome).** The user reports real slip → candidate/review does not work. The precise earliest failed stage is unknown because no selected asset ID, per-stage counters, or contemporaneous Nexus scanner log evidence was captured.

## Logcat Findings

**PARTIAL.** After launch, app-process PID `26578` was checked with a filter for Nexus-relevant crash, Capacitor, WebView/Chromium, database, permission, and JavaScript error terms. No matching errors were observed in that app-process logcat sample. A later read of the current app PID log after the user's reported test also had no matching scanner lines; the Android log buffer contained unrelated system/vendor crashes, which were excluded. These samples do not establish that scan-time WebView/native bridge errors were absent, and the emulator was not used as physical-device evidence.

## Automated Regression Results

- `npm run build`: **PASS** — TypeScript project build, Vite production bundle, and PWA service worker completed.
- `npx cap sync android`: **PASS** — assets and Android plugin metadata synchronized.
- `npx vitest run src/App.test.ts src/features/screentutor/services.test.ts src/features/screentutor/ScreenTutorApp.test.tsx src/features/finance/slipScanner --reporter=dot`: **PASS — 97 files, 497 tests**. Includes route/ScreenTutor and current slip scanner automated paths.
- `npm run lint`: **PASS** — Oxlint, exit code 0.
- Full suite was not rerun in Phase 0.4; the Phase 0.3 baseline is the two consecutive 2,904-test passes. No source/test behavior changed in this phase.

## Unverified Items

- The user-reported basic smoke PASS was not independently itemized into navigation/back/resume substeps.
- Exact permission state at scan time, MediaStore result count, page enumeration, image-byte read/decode, QR/OCR outcome, candidate persistence, cancellation timing, and retry outcome remain uninstrumented/unknown.
- App PID log sampling did not provide a scanner-specific trace; no claim is made that the complete historical logcat for the user's attempt is available.
- The exact Codex execution-context restriction affecting Java NIO AF_UNIX selector wakeup remains unidentified; the successful host build indicates no current repository Android build defect.

## Manual Actions Required

See [Phase 0.4.1 Android scanner runtime gap investigation](PHASE_0_4_1_ANDROID_SCANNER_RUNTIME_GAP_2026-10-02.md). Do not repeat a whole-gallery scan on the live personal gallery until diagnostic instrumentation/guardrails are planned: the current verified-QR completion path calls Smart Import automatically and can create transactions. Preserve current app data; do not clear, uninstall, or reset it.

## Remaining Blockers

1. Phase 0.4.1 must resolve the manual scanner permission-entry gap and identify the earliest real-runtime failure stage using safe, observable diagnostics.
2. Re-test on physical Android 16 only with consented test media and an explicit safeguard against automatic transaction import.

## Next Recommended Action

Complete the investigation and corrective phases described in the Phase 0.4.1 report. Do not start Bank Connectivity or Phase 0.5.

## Completion Status

```text
PHASE_0_4_STATUS = PARTIAL
ANDROID_ENVIRONMENT = VERIFIED (inventory captured)
HOST_WINDOWS_ASSEMBLE_DEBUG = PASS (user-run normal PowerShell; 1m 29s)
CODEX_ENVIRONMENT_ASSEMBLE_DEBUG = FAIL (Java NIO AF_UNIX loopback startup)
REPOSITORY_ANDROID_BUILD_DEFECT = NOT_INDICATED
HISTORICAL_LOOPBACK_FAILURE_REPRODUCED = YES in Codex execution context only
LOOPBACK_ROOT_CAUSE = Execution-context-specific Java NIO AF_UNIX loopback failure; exact Codex/Windows mechanism UNRESOLVED
CAP_SYNC_ANDROID = PASS
ASSEMBLE_DEBUG = PASS on normal Windows host / FAIL in Codex execution context
APK_GENERATED = YES
APK_PATH = android/app/build/outputs/apk/debug/app-debug.apk
APK_SIZE = 21632472 bytes
APK_MODIFIED_TIME = 2026-10-02 22:45:26 +07:00
APK_SHA256 = B3C206AE712456520F6D40F0D40884F3199C7379A49FCEE04E71924642526342
APK_CURRENT_BUILD = YES (user build evidence plus timestamp/package verification)
ADB_AVAILABLE = YES
PHYSICAL_DEVICE_ADB = CONNECTED
PHYSICAL_DEVICE_SERIAL = 10AE9R1ZJY001PY
PHYSICAL_DEVICE_MODEL = V2348 (Vivo)
EMULATOR_PRESENT = YES (emulator-5554; not physical-device evidence)
PHYSICAL_DEVICE = CONNECTED (emulator-5554 is separate virtual target)
EXISTING_NEXUS_INSTALLATION = YES (version 1.0/code 1 before update)
APK_INSTALL = PASS (adb install -r)
APK_INSTALL_FAILURE_REASON = NONE
DATA_PRESERVATION = PRESERVED (firstInstallTime unchanged; no uninstall/clear/reset)
ANDROID_APP_LAUNCH = PASS
ANDROID_ROOT_OPENS_NEXUS_ALL = YES
LAUNCH_CRASH = NONE observed
RELEVANT_LOGCAT_ERRORS = NONE observed in filtered app-process PID 26578 sample
ANDROID_SMOKE_TEST = PASS (user-reported physical test)
SCANNER_PERMISSION_GALLERY_FLOW = FUNCTION_NOT_PRESENT_OR_NOT_REACHABLE (user report; manual path omits permission request in source)
PHYSICAL_DEVICE_PERMISSION_STATE_AT_LATER_INSPECTION = GRANTED (READ_MEDIA_IMAGES and READ_MEDIA_VISUAL_USER_SELECTED)
EXPLICIT_EXHAUSTIVE_SCAN = FAIL (user-reported)
AUTOMATIC_INCREMENTAL_SCAN = NOT_TESTED
DATE_RANGE_UI_OR_BEHAVIOR = PASS (user-reported; exact boundary not supplied)
SCAN_CANCELLATION = FAIL (user-reported; exact cancel stage unknown)
SCAN_RETRY = FAIL (user-reported; no dedicated Retry button found)
REAL_GALLERY_SCAN = FAIL (user-reported scanner outcome)
REAL_SLIP_SMOKE_TEST = FAIL (user-reported end-to-end outcome)
CANDIDATE_REVIEW_FLOW = FAIL (user-reported; earliest pipeline stage unknown)
SMART_IMPORT_REACHABILITY = UNKNOWN (wired in source, not verified on Android)
SCANNER_MANUAL_TEST_REQUIRED = YES
FOCUSED_TESTS = 497 PASS / 0 FAIL
BUILD = PASS (web production build and normal-host Android assembleDebug)
LINT = PASS
SOURCE_FILES_CHANGED = 0
TEST_FILES_CHANGED = 0
CONFIG_FILES_CHANGED = 0
DOCUMENTATION_FILES_CHANGED = 2 (Phase 0.4 report updated and Phase 0.4.1 report created in this task)
DESTRUCTIVE_DEVICE_ACTIONS = 0
DEPLOYMENT = NOT_PERFORMED
COMMIT = NOT_PERFORMED
PUSH = NOT_PERFORMED
NEXT_ACTION = Implement a scoped diagnostic/fix phase for explicit permission handling and scan-stage observability; then retest with safe fixture and import disabled
```

## Phase 0.4.2 Follow-up — 2026-10-03

Phase 0.4.2 implemented a permission-aware manual scanner, review-before-import behavior, an opt-in transaction-write safe mode, bounded privacy-safe stage diagnostics, and cancellation/retry safeguards. The scanner-focused suite passed 99 files / 494 tests; lint, TypeScript/Vite production build, and Capacitor sync passed. Full repository regression passed 465/466 files and 2,921/2,922 tests; its sole TradingDashboard loading-state assertion passed on an isolated 4-test rerun. See [Phase 0.4.2 Android scanner runtime fix](PHASE_0_4_2_ANDROID_SCANNER_RUNTIME_FIX_2026-10-03.md) for detailed evidence and retest instructions.

The physical device has **not** received or run a Phase 0.4.2 APK. `assembleDebug` in the Codex execution context remains blocked before project configuration by `java.io.IOException: Unable to establish loopback connection`; the successful APK/build from Phase 0.4 predates these source changes and must not be treated as the new scanner fix. Do not uninstall or clear application data. Build with `VITE_NEXUS_SCANNER_SAFE_MODE=true` in normal Windows PowerShell, then use a data-preserving `adb install -r` only after checking package/signature compatibility. The physical retest must confirm permission handling, exhaustive/date-scoped scan, real representative media, cancel and fresh retry, candidate SAFE REVIEW, and that Import is blocked with no transaction change. No bank connectivity or Phase 0.5 work began.

```text
PHASE_0_4_STATUS = PARTIAL (source fix and automated gates complete; new APK build/physical scanner verification outstanding)
PHASE_0_4_2_SOURCE_FIX = COMPLETE
SCANNER_FOCUSED_TESTS = PASS (99 files / 494 tests)
FULL_REGRESSION = PARTIAL (2,921/2,922 pass; isolated repeat of sole failure passed 4/4)
LINT = PASS (Oxlint)
TYPESCRIPT_AND_WEB_BUILD = PASS
CAPACITOR_SYNC_ANDROID = PASS
CURRENT_PHASE_0_4_2_APK = NOT_PRODUCED (Codex Gradle loopback failure)
PHYSICAL_SCANNER_RETEST = NOT_RUN
DATA_CLEAR_OR_UNINSTALL = NOT_PERFORMED
COMMIT = NOT_PERFORMED
PUSH = NOT_PERFORMED
DEPLOYMENT = NOT_PERFORMED
NEXT_ACTION = Build a VITE_NEXUS_SCANNER_SAFE_MODE=true APK in normal Windows PowerShell and run the consented manual checklist on physical Vivo V2348
```
