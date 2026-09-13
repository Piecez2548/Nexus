# SYNC-REALTIME-MEASURE-001 — Targeted pull runtime measurement

**Date:** 2026-09-13  
**Status:** Completed — installed-device runtime trace  
**Model:** Luna

## Scope

This task measures the runtime behavior of the targeted pull introduced by `SYNC-TARGETED-PULL-001`. It verifies the installed Android artifact performs a single-table pull and does not silently issue the full 24-table pull during that invocation.

## Trace

After the background pass settled on the unlocked vivo V2348 build, the exported `runTargetedSync(userId, "budgets")` path was invoked through the WebView runtime. Resource timings were cleared immediately before the call and filtered by request start time, so unrelated earlier requests were excluded.

Result: exactly one `synced_records` pull request for `table_name=eq.budgets`; measured browser resource duration was approximately 458 ms. No other pull table appeared in that invocation. The temporary mobile budget fixture was deleted afterward and the original data remained intact.

## Validation

- Focused sync tests: 67/67.
- Related sync suite: 157/157.
- Release build, bundle budget and Android build passed.
- Production deployment `dpl_8JaRkq8VvkT3oL9dKxTgUvzKsRtn` and smoke tests 2/2 passed.
- APK SHA-256: `FDF22BBECDE679C48096F67ABBBF9EAEE1B3241C2E55356B31127B2CE40462AD`.

## Boundary

This is an installed-device runtime measurement of the targeted engine. It does not claim a cross-device Realtime arrival latency, which requires a second authenticated client writing the remote row; that is the next measurement task if the project needs that evidence.
