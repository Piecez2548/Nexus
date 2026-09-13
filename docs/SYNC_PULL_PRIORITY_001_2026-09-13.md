# SYNC-PULL-PRIORITY-001 — Realtime table pull priority

**Date:** 2026-09-13  
**Status:** Implementation complete; release verification in progress  
**Model:** Sol

## Problem

The Realtime channel already identified that a user's cloud row changed, but the foreground sync pass always started with the same table order. A change in a later table therefore waited behind the first batch even though the existing four-request pull window was already bounded and deterministic.

## Change

`SyncProvider` reads `table_name` from the Realtime payload and accepts it only when it belongs to the shared `SYNC_TABLE_NAMES` whitelist. The existing `runFullSync` receives that optional hint and moves the table to the front of the first four-table batch. Every other table is still pulled in the same deterministic batches, with the existing version checks, tombstones, cursor handling, per-table refresh and final deduplication unchanged.

This reuses the current full-sync path instead of introducing a second targeted pull implementation, so offline recovery, timer and online-event syncs retain their original behavior.

## Validation

- Focused tests: 65/65 passed (`syncEngine`, `SyncProvider`, `authStore`).
- Related sync suite: 155/155 passed across 19 files.
- Release build, production deployment, Android installation and post-deployment smoke/physical checks are recorded here when complete.

## Remaining

The complete 24-table pass remains intentional: prioritization improves first visibility for the changed table but does not skip other tables or change conflict semantics.
