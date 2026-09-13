# SYNC-TARGETED-PULL-001 — Targeted Realtime pull

**Date:** 2026-09-13  
**Status:** Completed  
**Model:** Luna

## Problem

After `SYNC-PULL-PRIORITY-001`, a valid Realtime event still caused all 24 table pull requests to run. The changed table arrived first, but unrelated tables still consumed network round trips and battery on a foreground mobile client.

## Change

The existing sync engine now has a targeted entry point used only when `SyncProvider` has a validated `table_name` from a user-filtered Realtime event. It keeps the complete push, tombstone, cursor, malformed-row, conflict, per-table refresh and dedupe logic, but limits the pull phase to that table. The periodic timer, browser online recovery and manual “Sync Now” continue to call the complete 24-table pass, so a missed, malformed or concurrent Realtime event is repaired by the existing fallback boundary.

No second repository or conflict-resolution path was introduced. The targeted mode is a pull-scope option over the same internal orchestration.

## Validation

- Focused tests: 67/67 passed (`syncEngine`, `SyncProvider`, `authStore`).
- Related sync suite: 157/157 passed across 19 files.
- Release build and bundle budget passed.
- Production deployment `dpl_8JaRkq8VvkT3oL9dKxTgUvzKsRtn` is READY and aliased to `https://nexus-lemon-eight-32.vercel.app`; production smoke passed 2/2.
- Android debug APK was installed in place on vivo V2348 with SHA-256 `FDF22BBECDE679C48096F67ABBBF9EAEE1B3241C2E55356B31127B2CE40462AD`; existing first-install time `2026-07-24 01:35:06` and local data remained intact.
- Post-install mobile smoke reached Dashboard and Budget after unlock. A temporary Transport budget was created to exercise the encrypted write/push path, then deleted; the original Food budget remained and the temporary row was gone after cleanup.
- Physical targeted-pull trace on the installed APK invoked `runTargetedSync(userId, "budgets")` after the background pass settled: exactly one pull request was emitted for `budgets`, with a measured resource duration of approximately 458 ms and no unrelated pull requests in that invocation.
- Focused tests: 67/67 passed; related sync suite: 157/157 passed; TypeScript, lint, release build and Android build passed.

## Remaining

The complete 24-table pass remains the recovery boundary by design. Targeted mode is intentionally restricted to validated Realtime table names and is never used for timer, online or manual sync. The single-table pull and fallback routing are covered by the sync-engine, auth-store and provider regressions; the mobile trace verified the installed build emits only the targeted table without exposing encrypted payloads.
