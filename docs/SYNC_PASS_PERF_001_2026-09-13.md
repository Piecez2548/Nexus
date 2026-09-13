# SYNC-PASS-PERF-001 — Bounded Pull Concurrency

**Status:** Completed

**Date:** 2026-09-13

**Model:** Sol

## Problem

The foreground Realtime trigger starts the existing full sync immediately, but a pass still pulled 24 independent tables one after another. A Realtime event that arrived during that tail had to wait for the serialized pass before the queued follow-up could begin.

## Implementation

- `runFullSync()` now pulls independent tables in deterministic batches of four concurrent requests.
- Every table still uses the existing `pullTable()` path, including version and structural validation, encrypted storage, cursor advancement and tombstone handling.
- `Promise.all()` results are processed in the original table order. Store refreshes and collected errors therefore remain deterministic even when network responses complete in a different order.
- The final account/category deduplication and dependent-store refresh remain after all pulls complete.
- The concurrency window is deliberately bounded; it avoids an unbounded burst against Supabase while removing the long sequential network tail.

## Physical Android Evidence

The final APK was installed in place on vivo V2348 with application data preserved. A temporary encrypted transaction was created, an app-generated encrypted envelope was published as a remote edit, and the receiving transaction UI plus WebView resource timings were observed.

- The cloud edit appeared in the transaction UI in **1,208.0 ms**.
- The 24 pull requests started in four-request groups at approximately 0.842 s, 1.248 s, 1.857 s and 2.047 s.
- The complete 24-table pull pass finished in **2,212.9 ms**.
- The pull window test verified a maximum of exactly four active requests and all 24 tables were attempted.
- The transaction store refreshed during the pass; unrelated table work did not block the changed row's visibility.

The synthetic row was deleted after measurement. IndexedDB contained 32 transactions, the test identity was absent locally, and its cloud row remained as a terminal tombstone.

## Validation

- Focused sync/encryption suite: 3 files, 49/49 tests passed.
- Related sync suite: 19 files, 153/153 tests passed.
- TypeScript: passed.
- Configured lint: passed.
- Release build and bundle budget: passed (200 JS chunks, 3,709.8 KiB total, largest chunk 454.9 KiB).
- Android build: passed; APK v2 signature verified.
- APK SHA-256: `A1E718A8F6D8886C4A013F96D85307AE41E82BD25EB43483B455B31F5FE96349`.
- Production smoke: 2/2 passed against the existing production alias before this change; the current commit is ready for the next production deployment.

## Remaining Limit

The pass still performs all 24 table pulls for a complete consistency check. The bounded window reduces network tail time while preserving that behavior; a future targeted pull would need separate correctness tests for cursor floors, local edits during pull, tombstones and account/category deduplication before it could replace the full pass.
