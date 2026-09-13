# SYNC-REALTIME-OBS-001 — Sync failure observability

**Date:** 2026-09-13  
**Status:** Completed  
**Model:** Luna

## Change

Optional Sentry monitoring now receives structured sync failures from `authStore` with a safe operation path (`full` or `targeted`) and the validated table name when one exists. `SyncProvider` reports only Realtime `CHANNEL_ERROR` and `TIMED_OUT` statuses. Account IDs, encrypted payloads and local entity values are excluded from the additional context.

## Validation

- Sync suite: 159/159 passed.
- Focused auth/provider tests: 37/37 passed.
- TypeScript, Oxlint, release build and bundle budget passed.
- Android debug build completed and APK installed in place on vivo V2348; first-install time remained `2026-07-24 01:35:06`.
- Production deployment: `dpl_ADFko6yYCSh2cgUCnhkaN4ygnpVB` (READY).
- Production alias returned HTTP 200 after deployment.

The monitoring layer remains optional and does not change sync retry, timer fallback or local-first behavior.
