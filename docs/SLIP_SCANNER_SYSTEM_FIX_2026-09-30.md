# Slip Scanner System Fix — 2026-09-30

## Executive summary

The scanner had a mismatch between the user's explicit “scan all” action and the faster background/incremental path, plus date-only end bounds that could omit part of the selected final day. On web, the fallback selected files rather than offering a directory-oriented flow. This follow-up makes a deliberate scan exhaustive, supports selecting a folder where the browser allows it, applies inclusive local-date ranges consistently, and makes OCR worker startup failures recoverable.

## Changes recorded

- Explicit native scans now request non-incremental enumeration and the exhaustive user-triggered processor; automatic startup remains incremental with QR prefiltering.
- Web scan selection accepts a directory where supported, filters supported image files, passes the selected date range through, and reports an empty image selection.
- Date-only `from`/`to` bounds use local-day semantics; `to` is implemented as an exclusive next-midnight boundary. Full ISO timestamps retain their time component.
- OCR worker startup failure releases its pool slot, rejects queued work rather than leaving it blocked, and allows later retry.
- English/Thai scanner copy and regression tests were updated.

## Validation evidence

- `npm run build`: passed (TypeScript and production build).
- `npx vitest run src/features/finance/slipScanner src/database/db.test.ts src/database/backupService.test.ts`: 96 files, 501 tests passed.
- Focused gallery flow/hooks/media/OCR tests: 7 files, 38 tests passed; TopBar/i18n checks: 2 files, 13 tests passed.
- Scoped Oxlint and ESLint checks: passed.
- `npx cap sync android`: passed; this syncs web assets/plugins only.
- Tesseract `tha+eng` worker initialization and a recognize-call smoke test resolved; this does not validate OCR quality on genuine slips.

## Limits and remaining work

- Android `assembleDebug` did **not** complete: Gradle failed before task configuration with `java.io.IOException: Unable to establish loopback connection`. Retries with no-daemon, IPv4 preference, and empty Gradle JVM args had the same environment-level failure. Therefore this revision has not been compiled into an APK or tested on a device.
- A real gallery scan, real bank slips/OCR accuracy, browser-specific directory-picker support, and Android runtime permissions/device behavior remain to be verified. Browser folder selection depends on browser support; users can only scan files the browser returns.
- No deployment was performed.

## Related records

This is a follow-up to [QR-only gallery scan](QR_ONLY_GALLERY_SCAN_2026-09-13.md), [slip candidate audit](SLIP_CANDIDATE_AUDIT_2026-09-13.md), [scan setup UX](UX_SLIP_SCAN_SETUP_2026-09-13.md), and [Android QR benchmark](QR_SCAN_ANDROID_BENCHMARK_2026-09-14.md). Those records retain their original historical measurements and conclusions.
