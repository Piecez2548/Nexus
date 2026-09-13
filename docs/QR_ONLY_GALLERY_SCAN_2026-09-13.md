# QR-only gallery scan — 2026-09-13

The full-gallery scan now has an explicit QR pre-filter fast path. It detects QR pixels first and filters ordinary photos before candidate creation, so Tesseract never starts for the overwhelming majority of non-slip images. A detected QR that is not a usable EMVCo payload still uses the existing OCR fallback because Thai slip-verification QRs need printed date/time and bank metadata. The manual image-picker flow keeps the same QR → OCR behavior.

When QR recovery is needed, the QR-only path is bounded to two transformed attempts after the initial decode. This keeps worst-case work predictable for a large gallery and avoids spending several seconds on six recovery variants for every non-slip image.

The queue still records filtered images as scanned, so incremental scans do not repeat them, while only QR-bearing images reach Import Preview. Focused coverage includes the extractor and processor filter behavior; TypeScript, lint, targeted tests and the production build passed.

The one-second figure remains a device-measured target, not a universal guarantee. Actual latency depends on image dimensions, WebView/camera codecs, QR placement and device CPU. A representative Android benchmark is still required before publishing a hard p50/p95 SLA for 10,000 images.
