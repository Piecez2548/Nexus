# UX-005 — Slip scan setup simplification

**Date:** 2026-09-13  
**Status:** Completed  
**Scope:** Personal/demo web and Android experience; debug APK installed on the connected device

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

- Targeted scanner tests: `BankSelectionPopup` and `GalleryScanFlow` passed, including the automatic-import flow.
- TypeScript (`npx tsc -b`): passed.
- ESLint/Oxlint (`npm run lint`): passed.
- Impeccable detector: no findings for the changed component.
- `git diff --check`: passed.

## Follow-up — 2026-09-30

The setup's explicit scan action now selects the exhaustive path; web folder selection is offered where supported, and date ranges pass through to picked files. The historical UX validation above predates this follow-up. Current build/test evidence and Android/browser verification still needed are in [SLIP_SCANNER_SYSTEM_FIX_2026-09-30.md](SLIP_SCANNER_SYSTEM_FIX_2026-09-30.md).
