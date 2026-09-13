# SYNC-REALTIME-ERROR-CLASSIFY-001 — Ignore expected locked-startup sync

**Date:** 2026-09-13  
**Status:** Completed  
**Model:** Luna

## Finding

The first Android telemetry snapshot reported one generic sync error during startup. A typed snapshot after instrumentation identified it as `sync:EncryptionLockedError`: the periodic sync can race the app-lock gate before a session DEK is resident. This is an expected state and the timer/online retry already provides the correct recovery.

## Fix

`authStore` now clears the transient sync state and skips operational telemetry/Sentry reporting for `EncryptionLockedError`. Other sync failures retain typed local counters and privacy-safe monitoring context.

## Validation

- Auth store tests: 31/31 passed.
- Related sync suite: 160/160 passed.
- TypeScript, Oxlint, release build and bundle budget passed.
- Final Android APK SHA-256: `D2165D7146FBB8DFA279CF2E1F1D4DA7AD3D4D210A6A9C18C8C1CFB561053766`.
- In-place Android install succeeded; first-install time remained `2026-07-24 01:35:06`.
- Locked startup snapshot after the fix: one `sync.full` timing, `errors: 0`, empty error samples.
- Production deployment: `dpl_CLvNezRzaZ9CjpqaRLRBZTaHDrcq` (READY); production smoke returned HTTP 200.
