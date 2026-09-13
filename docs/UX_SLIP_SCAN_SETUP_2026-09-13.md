# UX-005 — Slip scan setup simplification

**Date:** 2026-09-13  
**Status:** Completed  
**Scope:** Personal/demo web experience; no mobile build installed

## Change

The gallery scan setup now leads with a single **Scan all photos** action. This is the common path: Nexus scans the available gallery, filters the extracted candidates, and sends them through Smart Import automatically when the scan settles.

Bank selection, date range, search, quick-select and scan estimates remain available behind **Choose banks or dates**. The filtered path still uses the existing selection store and Start scan action.

Using the one-tap action applies an unfiltered scan for that run without clearing the user's remembered bank selection for a later filtered scan.

## Preserved behavior

- Native gallery enumeration and web file-picker fallback are unchanged.
- Date-range bounds continue to be one-off scan options.
- Pause, resume and cancel remain available while a manual scan is running.
- Smart Import, duplicate detection and Import History remain authoritative; the gallery flow no longer pauses for a separate review drawer.
- Unknown-bank candidates remain visible after filtered scans.

## Validation

- Targeted scanner tests: 13/13 passed across `BankSelectionPopup` and `GalleryScanFlow`.
- TypeScript (`npx tsc -b`): passed.
- ESLint/Oxlint (`npm run lint`): passed.
- Impeccable detector: no findings for the changed component.
- `git diff --check`: passed.
