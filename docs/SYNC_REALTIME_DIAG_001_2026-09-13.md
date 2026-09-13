# SYNC-REALTIME-DIAG-001 — Realtime UPDATE routing diagnosis

**Date:** 2026-09-13  
**Status:** Completed  
**Model:** Luna

## Finding

Postgres Realtime's default replica identity can omit unchanged columns from an `UPDATE` payload. Because `table_name` is stable while the encrypted payload changes, the client could receive an UPDATE without a usable table hint and fall back to the complete 24-table timer pass.

## Fix

- Added and applied migration `20260913095000_realtime_full_identity.sql`.
- Set `public.synced_records` to `REPLICA IDENTITY FULL`, preserving `table_name` in old-row UPDATE/DELETE payloads.
- Added a regression for an UPDATE whose table hint is present on the old row.

## Validation

- Sync suite: 158/158 passed.
- TypeScript, Oxlint, release build, bundle budget and Android debug build passed.
- Production deployment: `dpl_CvQChywRfXtEkYDZf4fitGzvJMXL` (READY).
- Installed APK SHA-256: `FDF22BBECDE679C48096F67ABBBF9EAEE1B3241C2E55356B31127B2CE40462AD`; installed in place on vivo V2348 with first-install time preserved.
- Fresh production-to-Android edit of `SYNC-REALTIME-DIAG-001` from ฿43 to ฿44 appeared in approximately 10.2 seconds. The mobile trace contained a targeted `transactions` request at approximately 9.9 seconds, separate from normal recovery timer passes.
- Deleting the temporary row removed it on Android in approximately 8.0 seconds; both clients returned to the 32-transaction baseline.

No plaintext encrypted payloads were exported and the temporary fixture was removed.
