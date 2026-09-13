# TEST-STABILITY-002 — Sync settings async mock coverage

**Date:** 2026-09-13  
**Status:** Completed  
**Model:** Luna

## Finding

`SyncSettings.test.tsx` mocked `runFullSync` but not the sibling `runTargetedSync` export that `authStore` dynamically imports. The test therefore failed before invoking the manual full-sync path. Its assertion also assumed the dynamic import had completed immediately after the click.

## Fix

Added the missing targeted-sync mock and reset, then waited for the asynchronous full-sync call in the existing test. Production code and sync behavior were unchanged.

## Validation

- Settings suite: **48/48 passed** across 10 files.
- `npm run lint`: passed.
- `npm run build:release`: passed; bundle budget 201 JS chunks, 3711.8 KiB total, largest 458.6 KiB.
- A full-suite run was started after the fix, but the worker-one process remained active without returning a final report for more than seven minutes and was stopped. No additional failure was observed after the isolated fixture failure was corrected.
- No new Vercel deployment or APK was required because this was test-only coverage; the deployed runtime remains unchanged.
