# Slip candidate audit — 2026-09-13

## Scope

This audit checks whether the strict QR-only gallery scan left unreviewed candidates that could be imported into Transactions.

## Result

- The strict run for 2026-09-01 through 2026-09-13 completed 113/113 images.
- Four QR detections were reported; two verified, non-duplicate candidates with positive amounts were imported.
- The current `slipScanCandidates` store contains 242 records, all from older runs (28, 29, 30 and 39), not from the strict run.
- Of those historical records, 238 are OCR sourced and 4 are QR sourced. Their available dates are 2026-05-01 through 2026-06-27, outside the requested September range.
- No current-range rejected candidate is available for review or import. The two non-imported detections from the strict run were rejected by the verified-QR/duplicate gate and were not persisted as importable candidates.

## Decision

The Transactions dataset remains limited to the two verified QR imports. The 242 historical candidate rows were cleared from device-local operational storage after confirming that they were outside the requested date range; no transaction rows were changed.

## Follow-up

Keep candidate storage operational and short-lived. Do not broaden automatic import to OCR or unverified QR data without a review step. Any future retention change should be a separate, explicit task.
