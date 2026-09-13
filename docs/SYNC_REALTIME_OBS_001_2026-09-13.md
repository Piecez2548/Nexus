# SYNC-REALTIME-OBS-001 — Sync failure observability

**Date:** 2026-09-13  
**Status:** Completed  
**Model:** Luna

## Change

Optional Sentry monitoring now receives structured sync failures from `authStore` with a safe operation path (`full` or `targeted`), validated table name when one exists and an error type. `SyncProvider` reports only Realtime `CHANNEL_ERROR` and `TIMED_OUT` statuses. The existing on-device `localTelemetry` also records full/targeted timings and typed sync/Realtime error counters for local inspection. Account IDs, encrypted payloads and local entity values are excluded from the additional context.

## Validation

- Sync suite: 159/159 passed.
- Focused auth/provider tests: 37/37 passed.
- TypeScript, Oxlint, release build and bundle budget passed.
- Android debug build completed and APK installed in place on vivo V2348; final APK SHA-256 is `EA98D041BC6C9AD7771AF30B24CF7105A9A840973D9F333E19841D77F329A241`, and first-install time remained `2026-07-24 01:35:06`.
- Production deployment: `dpl_3Z63qFe5wTVApsKiifCZG45SHwRp` (READY).
- Production alias returned HTTP 200 after deployment.

The monitoring layer remains optional and does not change sync retry, timer fallback or local-first behavior.
