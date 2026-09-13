# Biometric unlock fix (2026-09-13)

## Problem

The Android biometric credential could be present while the sensor reported a temporary unavailable state during app startup or resume. The app combined those two checks, hid the fingerprint action and persisted the stale WebView flag. During setup, an exception from the native secure-credential call also left the form without a user-visible result.

## Fix

- Credential reconciliation now checks the native credential store independently of transient sensor availability.
- The lock screen reconciles the flag in both directions on every native unlock-screen mount, so a removed credential clears the stale flag and a surviving credential is restored.
- Biometric setup now catches native errors and shows a localized retry message instead of leaving the form in a submitting state.
- Android build entry points explicitly verify the committed `patch-package` biometric hardening before Capacitor sync, ensuring the crypto-bound prompt uses the safe strong-biometry configuration.

## Validation

- Focused biometric, app-lock, lock-gate and Security settings tests: **75/75 passed**.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run cap:build:windows`: passed; debug APK produced at `android/app/build/outputs/apk/debug/app-debug.apk` (SHA-256 `E8BCBBC2DE92322EC6F6DEA094CE445C96E3EB62D5723AF1F43F4711DA04693C`).
- The APK was not installed on a device in this task, so the final fingerprint prompt still needs a physical-device confirmation after installing this artifact.
