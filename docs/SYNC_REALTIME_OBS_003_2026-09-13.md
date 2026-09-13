# SYNC-REALTIME-OBS-003 — Normal production session observation

**Date:** 2026-09-13  
**Status:** Completed  
**Model:** Luna

## Scope

Observed the deployed Android WebView after the app was unlocked, using the read-only `window.__NEXUS_TELEMETRY__` snapshot. This validates the error classification fix during an ordinary foreground session rather than only during the app-lock startup race.

## Evidence

- Device: vivo V2348 (`10AE9R1ZJY001PY`), installed APK SHA-256 `D2165D7146FBB8DFA279CF2E1F1D4DA7AD3D4D210A6A9C18C8C1CFB561053766`.
- The unlocked Dashboard session completed repeated `sync.full` passes: count increased from 5 to 9 during the first observation window and to 16 after the follow-up window.
- Final snapshot: `sync.full` count **16**, total **42,806.8 ms**, average **2,675.4 ms**.
- Error counter stayed at **0** for every snapshot; `errorSamples` remained empty, including Realtime channel errors.
- No account IDs, entity values or encrypted payloads were read or transmitted; only the aggregate local snapshot was inspected.

## Result

The production session shows repeated successful full-sync recovery with no typed sync or Realtime errors after the expected locked-startup race was excluded. No additional sync behavior change is justified by this observation.

Production code remains deployed as `dpl_CLvNezRzaZ9CjpqaRLRBZTaHDrcq` (READY, HTTP 200). This observation changed documentation only; no new APK or Vercel build was necessary.
