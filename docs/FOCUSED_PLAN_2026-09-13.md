# Focused project plan — ordinary personal/demo scope

**Updated:** 2026-09-13

The project is currently treated as a personal/demo application. This plan keeps only work that protects day-to-day use, data integrity and the optional cloud-sync path. Public launch, paid use, organizational DataLens use and real-data commercial operations are outside the active scope.

## Current-cycle results

1. **Test-suite stability investigation** — completed the isolated 451-file/2,837-test run with 16 workers; keep jsdom startup optimization as a P2 maintenance item and retain safe isolation.
2. **Cloud-sync security maintenance** — verified the linked schema lint and retained the existing migration/RLS baseline. Preserve the intentional backup-code RPC and deny-by-default attempt table behavior; advisor decisions remain deferred release work. [Maintenance record](CLOUD_SYNC_SECURITY_MAINTENANCE_2026-09-13.md)
3. **Core regression watch** — keep the already-passed CRUD, backup/recovery and cross-device sync checks as the regression gate for future code changes.
4. **QR-only gallery scan fast path** — completed the scoped performance change: full-gallery scans filter non-QR images before candidate creation, skip OCR, and cap recovery attempts; the one-second per-image target still needs representative Android p50/p95 measurement before it can be treated as an SLA. [Evidence](QR_ONLY_GALLERY_SCAN_2026-09-13.md)
5. **Daily navigation simplification** — completed the first usability pass: daily Dashboard/Transactions/Budget shortcuts are visible first while all existing routes remain grouped below. [Evidence](UX_DAILY_NAV_2026-09-13.md)
6. **Quick Add transaction entry** — completed the second usability pass: new entries start with essential fields while optional metadata stays available through progressive disclosure; scan/template drafts remain reviewable. [Evidence](UX_QUICK_ADD_2026-09-13.md)

The current focused cycle includes the navigation usability pass. Continue with the next usability slice only after this change is released and observed.

## Completed foundations

Core smoke, mobile/desktop CRUD sync, conflict handling, backup/restore, account recovery, realtime sync performance, Tools/DataLens web deployment and production smoke evidence are complete for the current demo scope.

## Paused until scope changes

RB-003–RB-020 and RB-022–RB-024 are release-only work: legal notices/terms, DPA, retention/rights, incident staffing/tabletop, pricing/research, independent pentest, Android production signing, formal release governance/decision and commercial deployment acceptance. RB-001 is already Not Applicable for this scope. Reopen these items before public, paid, organizational or real-data pilot use.

Use **Luna** for active engineering work. Do not install a mobile build unless the scope or instruction changes.
