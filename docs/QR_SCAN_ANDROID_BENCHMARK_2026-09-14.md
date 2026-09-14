# Android QR gallery benchmark — 2026-09-14

## Method

- Device: vivo V2348 (`10AE9R1ZJY001PY`)
- Build: installed Nexus Android debug build
- Date range: 2026-09-01 through 2026-09-13 (113 native gallery assets)
- Mode: QR-only gallery scan with the production queue and extraction path
- Observation: progress completion timestamps captured from the live Android WebView

## Measurements

- Run duration: 108,703 ms (1 minute 48.7 seconds)
- Completed: 113/113 assets
- Throughput: approximately 1.04 images/second
- Completion-interval sample: 94 image-equivalent intervals (the first warm-up and final completion transitions were not separately observable from the UI poll)
- p50 completion interval: approximately 704 ms
- p95 completion interval: approximately 2,072 ms
- Average sampled interval: approximately 915 ms

These completion intervals are queue-level observations, not isolated QR-decoder or OCR stage timings. They are suitable for a device throughput signal, not a hard per-image latency SLA.

## Data-integrity observation

The benchmark required clearing the date-range scan cache. The repeat scan produced two additional PromptPay rows whose OCR date shifted to 14/9/2569, despite the original two rows already existing for 13/9/2569. Those two benchmark-created rows were removed immediately; the final Transactions table remains at the original two verified rows.

This exposes a duplicate-identity gap: a verified QR payload is not currently persisted on the `Transaction` row, so a date change can lower the duplicate score enough for Smart Import to keep both rows. Do not claim repeat-scan idempotency until that identity is persisted or the duplicate policy is corrected.

## Decision

The current device result does not support a one-second p95 claim. The QR fast path is approximately one image per second on this representative gallery, with a long tail above two seconds and a duplicate-identity fix required before repeated scans can be considered safe.
