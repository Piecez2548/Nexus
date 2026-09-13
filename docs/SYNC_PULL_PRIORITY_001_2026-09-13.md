# SYNC-PULL-PRIORITY-001 — Realtime table pull priority

**Date:** 2026-09-13  
**Status:** Completed
**Model:** Sol

## Problem

The Realtime channel already identified that a user's cloud row changed, but the foreground sync pass always started with the same table order. A change in a later table therefore waited behind the first batch even though the existing four-request pull window was already bounded and deterministic.

## Change

`SyncProvider` reads `table_name` from the Realtime payload and accepts it only when it belongs to the shared `SYNC_TABLE_NAMES` whitelist. The existing `runFullSync` receives that optional hint and moves the table to the front of the first four-table batch. Every other table is still pulled in the same deterministic batches, with the existing version checks, tombstones, cursor handling, per-table refresh and final deduplication unchanged.

This reuses the current full-sync path instead of introducing a second targeted pull implementation, so offline recovery, timer and online-event syncs retain their original behavior.

## Validation

- Focused tests: 65/65 passed (`syncEngine`, `SyncProvider`, `authStore`).
- Related sync suite: 155/155 passed across 19 files.
- Release build and bundle budget passed.
- Production deployment `dpl_DvQXnZxVvizjrkkaKa9sgv5SWzyR` is READY and aliased to `https://nexus-lemon-eight-32.vercel.app`; production smoke passed 2/2.
- Android debug APK was installed in place on vivo V2348 with SHA-256 `DA9F1454C5914283FAA0709950B3547D3B6BECAA318626B51B1899DC58A9BA65`; existing first-install time `2026-07-24 01:35:06` and local data remained intact.
- Post-install physical smoke reached the Transactions and Settings routes after unlock. Manual sync emitted the expected four-request first batch (`transactions`, `accounts`, `categories`, `recipientProfiles`), and the temporary transaction fixture was deleted; the encrypted local transaction count returned to the baseline 32.
- Focused tests: 65/65; related sync suite: 155/155; TypeScript, lint, release build and Android build passed.

## Remaining

The complete 24-table pass remains intentional: prioritization improves first visibility for the changed table but does not skip other tables or change conflict semantics. The deterministic non-default ordering is covered by the sync-engine regression (`budgets` first, followed by `transactions`, `accounts`, `categories` in the first batch); the physical smoke used the normal order because the temporary fixture was a transaction and did not require a synthetic remote budget payload.
