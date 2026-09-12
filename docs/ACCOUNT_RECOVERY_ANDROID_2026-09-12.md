# ACCOUNT-RECOVERY-ANDROID-001

Date: 2026-09-12 (Asia/Bangkok)

Status: completed for debug-device delivery. The recovery patch was packaged, verified and installed over the existing Nexus Android app on the connected vivo V2348. This task did not create a production-signed release artifact and did not exercise live account recovery.

## Build and artifact evidence

- Command: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-android.ps1`.
- Web TypeScript/Vite build, Capacitor sync and Gradle `assembleDebug` passed; Gradle reported `BUILD SUCCESSFUL` in 32 seconds.
- APK: `android/app/build/outputs/apk/debug/app-debug.apk`, 21,629,795 bytes, SHA-256 `717FE72D0D2A50721E0A69E77406F57B89DA29391F386DEF696654D20764C0D2`.
- Package: `com.nexus.app`, version code 1, version name 1.0, minimum SDK 24 and target SDK 36.
- APK Signature Scheme v2 verification passed. The signer is the Android debug certificate with certificate SHA-256 `3169d59782923a0ca52ed1e2a19a7148133f9b0db7ef7d66f645b46bc7ae4a3b`.
- Scanning all 200 packaged JavaScript assets found the local-key validation, account-mismatch guard, PIN-save failure and local-key mismatch handlers from `ACCOUNT-RECOVERY-001`.
- Related recovery/lock regression rerun: **4 files / 70 tests passed**. Configured lint (`npm run lint`, Oxlint) passed. There is no application ESLint installation/configuration, so no separate ESLint result is claimed.

## Device installation and smoke evidence

- Device: vivo V2348, Android 16 / API 36, physical display 1260 × 2800.
- `adb install -r` returned `Success`; this update mode preserves application data.
- The installed `base.apk` SHA-256 is `717fe72d0d2a50721e0a69e77406f57b89da29391f386def696654d20764c0d2`, exactly matching the locally built APK.
- First-install time remained `2026-07-24 01:35:06`; last-update time advanced to `2026-09-12 21:31:37`. Existing `app_webview`, `databases` and `shared_prefs` directories remained present.
- `com.nexus.app/.MainActivity` launched successfully in 1,868 ms and became the top resumed activity. The app rendered the signed-in Nexus All screen, providing additional evidence that the existing account session survived the in-place update.
- Smoke screenshot: `test-results/account-recovery-android-installed.png` (diagnostic artifact, excluded from delivery/source control).

## Limits

This is a debug APK signed by the Android debug key. It is suitable for the connected development device, not Play Store or production distribution, and does not close production-signing blocker RB-012.

The smoke check did not reset a production password, request an email, change the PIN, inspect financial records or run a real recovery flow. Therefore live mailbox-link recovery, MFA recovery and end-to-end encrypted recovery on Android remain unverified. Those checks require a dedicated test account and controlled fixture data to avoid risking the owner's account or encrypted records.

No source code changed during this Android packaging/install task. Files updated: this report, `docs/ACCOUNT_RECOVERY_DEPLOYMENT_2026-09-12.md`, `docs/ACCOUNT_RECOVERY_VERIFICATION_2026-09-12.md`, `docs/CHANGELOG.md`, and `tasks/TASK_REGISTRY.md`.

Next proposed task: `SYNC-CONFLICT-001` — exercise offline/reconnect, stale update, tombstone and provider-outage behavior using isolated synthetic device states. Use Astra because this is a multistep state-convergence and failure-recovery audit across storage, sync and browser behavior.
