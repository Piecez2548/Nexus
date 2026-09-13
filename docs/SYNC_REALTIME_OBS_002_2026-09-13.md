# SYNC-REALTIME-OBS-002 — Runtime telemetry inspection

**Date:** 2026-09-13  
**Status:** Completed  
**Model:** Luna

## Change

Added a read-only `window.__NEXUS_TELEMETRY__` diagnostics hook backed by the existing on-device telemetry singleton. It exposes aggregate timing, error, memory and startup fields for production support and Android WebView inspection without exposing account IDs, entity values or encrypted content.

## Runtime verification

- Final Android APK SHA-256: `BF4FF2195C1D81E8698FC5DCC086D1AFFDC49DA7AC7A91C3A8FA1E0E06D1E82E`.
- In-place install on vivo V2348 succeeded; first-install time remained `2026-07-24 01:35:06`.
- Android WebView returned a live snapshot from `window.__NEXUS_TELEMETRY__`: `sync.full` count 2, no Realtime channel error sample, and one generic `sync` error sample with no server message or user data.
- Snapshot unit test: 6/6 passed.
- Production deployment: `dpl_BS1sKeW6sdpmBY3G4FvLUFE6T41J` (READY); production smoke returned HTTP 200.

The generic sync error sample is intentionally redacted by the recording path; detailed diagnostics remain in optional Sentry when configured.
