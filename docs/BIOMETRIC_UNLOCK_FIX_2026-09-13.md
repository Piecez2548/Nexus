# Biometric unlock fix (2026-09-13)

## Problem

The Android biometric credential could be present while the sensor reported a temporary unavailable state during app startup or resume. The app combined those two checks, hid the fingerprint action and persisted the stale WebView flag. During setup, an exception from the native secure-credential call also left the form without a user-visible result.

## Fix

- Credential reconciliation now checks the native credential store independently of transient sensor availability.
- The lock screen reconciles the flag in both directions on every native unlock-screen mount, so a removed credential clears the stale flag and a surviving credential is restored.
- Biometric setup now catches native errors and shows a localized retry message instead of leaving the form in a submitting state.
- Android build entry points explicitly verify the committed `patch-package` biometric hardening before Capacitor sync, ensuring the crypto-bound prompt uses the safe strong-biometry configuration.
- The vivo V2348 device reproduced a second native failure: Android returned a successful fingerprint result with a null `CryptoObject`, which previously became `Failed to encrypt credentials: null`. The bridge now retains the cipher supplied to the prompt and uses it as a guarded fallback for secure credential writes/reads.

## Validation

- Focused biometric, app-lock, lock-gate and Security settings tests: **75/75 passed**.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run cap:build:windows`: passed; debug APK produced at `android/app/build/outputs/apk/debug/app-debug.apk` (SHA-256 `E8BCBBC2DE92322EC6F6DEA094CE445C96E3EB62D5723AF1F43F4711DA04693C`).
- A debug APK was installed on the connected vivo V2348 during the physical diagnosis. The latest fallback build enabled the credential, returned `isCredentialsSaved: true`, and completed a lock-now → fingerprint-unlock cycle. The encrypted fallback entries remained present after unlock.

## 2026-09-14 physical diagnosis

- The connected V2348 reports `isAvailable=true`, `strongBiometryIsAvailable=true`, fingerprint type, and granted `USE_BIOMETRIC`/`USE_FINGERPRINT` permissions.
- The setup form reproduced the localized failure after a successful native prompt. A direct native call returned `Failed to encrypt credentials: null`, identifying the null `CryptoObject` path rather than a wrong PIN or missing sensor.
- A native fallback patch was added to retain the authenticated cipher and guard null results. The follow-up validity-window build completed one successful enable/readback cycle on the V2348; the provider-specific failure was then handled by the encrypted compatibility fallback.
- Because the V2348 also rejected the retained per-operation cipher after authentication, secure credential setup now opts into the plugin's five-second Android authentication validity window. The prompt still gates the operation; encryption/decryption runs immediately after the successful prompt inside the native bridge.
- The V2348 continued to report `Keystore operation failed after authentication: User not authenticated` even with that window. The app now detects this provider-specific failure and falls back to the plugin's encrypted Android Keystore store (`AccessControl.NONE`) only after a fresh `verifyIdentity()` prompt on each write/read. PIN material remains encrypted at rest and the fallback never reads it without a live biometric verification.
- Final physical verification: the setup form no longer shows the red error, the native store reports both encrypted username/password entries, and lock-now followed by fingerprint unlock returns to the app while preserving `isCredentialsSaved: true`.
