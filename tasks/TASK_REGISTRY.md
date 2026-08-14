# Task Registry

Master registry of all planned and completed Nexus tasks, grouped by Epic. See [README.md](README.md) for conventions and lifecycle.

**Last Updated:** 2026-08-15

## Legend

- **Priority:** `Critical` · `High` · `Medium` · `Low`
- **Status:** `Todo` · `In Progress` · `Completed` · `Blocked`
- `Completed` reflects the **current implementation state** verified against `/docs` — this registry is both a backlog and an honest as-built view. Items marked `Todo` are genuinely not yet in the codebase (confirmed by direct code check, per the project rule to never claim features that don't exist).

## Status Summary

| Epic | Total | Completed | Todo | In Progress | Blocked |
|---|---|---|---|---|---|
| AI Analytics | 7 | 7 | 0 | 0 | 0 |
| Slip Scanner (OCR) | 7 | 5 | 2 | 0 | 0 |
| Vault | 4 | 0 | 4 | 0 | 0 |
| Finance | 4 | 1 | 3 | 0 | 0 |
| Security | 4 | 2 | 2 | 0 | 0 |
| Core | 3 | 3 | 0 | 0 | 0 |
| Testing | 3 | 3 | 0 | 0 | 0 |
| Accessibility | 2 | 2 | 0 | 0 | 0 |
| Performance | 2 | 2 | 0 | 0 | 0 |
| UX | 2 | 2 | 0 | 0 | 0 |
| Gallery Scanner (GS) | 50 | 50 | 0 | 0 | 0 |
| Platform (PLT) | 20 | 20 | 0 | 0 | 0 |
| **Total** | **108** | **97** | **11** | **0** | **0** |

---

## AI Analytics

Backing engine + UI all built — see [../docs/AI_ANALYTICS.md](../docs/AI_ANALYTICS.md). AI-001–AI-007 map to the Executive Summary report and the sub-engines it aggregates.

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| AI-001 | AI Analytics | Executive Summary | Critical | Completed | AI-003, AI-004, AI-006 |
| AI-002 | AI Analytics | Overall Assessment | High | Completed | — |
| AI-003 | AI Analytics | Behavior Analysis | High | Completed | — |
| AI-004 | AI Analytics | Forecast | High | Completed | — |
| AI-005 | AI Analytics | Risk Analysis | High | Completed | AI-004 |
| AI-006 | AI Analytics | Recommendations | High | Completed | — |
| AI-007 | AI Analytics | Action Plan | Medium | Completed | AI-006 |

---

## Slip Scanner (OCR)

On-device Tesseract.js scanning — see [../docs/MODULES.md](../docs/MODULES.md) (Finance module). Engine, gallery/batch scan, preview, and import exist; bank-selection popup and slip-specific duplicate detection are not yet in the code.

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| OCR-001 | Slip Scanner | Bank Selection Popup | Low | Todo | — |
| OCR-002 | Slip Scanner | Gallery Scanner | Medium | Completed | OCR-003 |
| OCR-003 | Slip Scanner | OCR Engine | High | Completed | — |
| OCR-004 | Slip Scanner | Slip Validation | Medium | Completed | OCR-003 |
| OCR-005 | Slip Scanner | Duplicate Detection | Medium | Todo | OCR-003 |
| OCR-006 | Slip Scanner | Preview | Medium | Completed | OCR-003 |
| OCR-007 | Slip Scanner | Import | High | Completed | OCR-006 |

---

## Vault

Password / secrets vault — **planned, not started** (see [../docs/ROADMAP.md](../docs/ROADMAP.md)). Would build on the existing client-side encryption primitives (see [../docs/SECURITY.md](../docs/SECURITY.md)).

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| VAULT-001 | Vault | Vault Core | High | Todo | — |
| VAULT-002 | Vault | Password Manager | Medium | Todo | VAULT-001 |
| VAULT-003 | Vault | Secure Notes | Medium | Todo | VAULT-001 |
| VAULT-004 | Vault | Recovery Keys | Medium | Todo | VAULT-001 |

---

## Finance

Core transactions/budgets/goals are built; net worth and a first-class subscription manager are on the roadmap — see [../docs/ROADMAP.md](../docs/ROADMAP.md).

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| FIN-001 | Finance | Budget Improvements | Medium | Todo | — |
| FIN-002 | Finance | Net Worth Improvements | Medium | Todo | — |
| FIN-003 | Finance | Financial Goals | High | Completed | — |
| FIN-004 | Finance | Subscription Manager | Medium | Todo | — |

> `FIN-002 Net Worth` and `FIN-004 Subscription Manager` have no base implementation yet — these tasks cover building the feature, not just improving it. `FIN-001 Budget Improvements` extends an already-shipped Budget feature.

---

## Security

Backup/restore built via `backupService`; a permission manager and audit log are not yet in the code — see [../docs/SECURITY.md](../docs/SECURITY.md).

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| SEC-001 | Security | Permission Manager | Medium | Todo | — |
| SEC-002 | Security | Audit Log | Medium | Todo | — |
| SEC-003 | Security | Backup | High | Completed | — |
| SEC-004 | Security | Restore | High | Completed | SEC-003 |

---

## Core

Foundational layers — all in place. Performance work (lazy loading, narrow selectors + `memo`, selective store refresh) is done for now but inherently ongoing — see [../docs/PROJECT_ARCHITECTURE.md](../docs/PROJECT_ARCHITECTURE.md) and [../docs/STATE_MANAGEMENT.md](../docs/STATE_MANAGEMENT.md).

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| CORE-001 | Core | Financial Core | Critical | Completed | — |
| CORE-002 | Core | AI Core | Critical | Completed | CORE-001 |
| CORE-003 | Core | Performance Core | High | Completed | — |

---

## Testing

Infrastructure + baseline coverage established (224 unit, 22 integration, 18 e2e files) — see [../docs/TESTING_GUIDE.md](../docs/TESTING_GUIDE.md). `Completed` here means the layer exists and is CI-enforced; new features still add their own tests under each layer.

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| TEST-001 | Testing | Unit Tests | High | Completed | — |
| TEST-002 | Testing | Integration Tests | High | Completed | — |
| TEST-003 | Testing | End-to-End Tests | High | Completed | — |

---

## Accessibility

Cross-cutting accessibility work. A11Y-001 added screen-reader labels (a shared `ChartFigure` `role="img"` wrapper) and keyboard semantics across the AI Analytics charts — see [Accessibility/A11Y-001.md](Accessibility/A11Y-001.md) and [../docs/AI_ANALYTICS.md](../docs/AI_ANALYTICS.md).

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| A11Y-001 | Accessibility | AI Analytics Accessibility Pass | Medium | Completed | — |
| A11Y-002 | Accessibility | Focus Rings, Chart Data Tables & Empty-state Polish | Medium | Completed | A11Y-001 |

> A11Y-002 delivered the A11Y-001 follow-ups: a global keyboard `:focus-visible` ring, visually-hidden data tables for the key charts (score radars, health trend, monthly cash flow), a no-flags empty state, and an `overflow-x-auto` wrapper on the desktop merchant table. Remaining: data tables for the secondary charts (their aria-label headline covers them for now).

---

## Performance

AI Analytics engine performance passes — both are output-preserving optimizations of the analyzer/trend pipeline, see [../docs/TECHNICAL_DEBT.md](../docs/TECHNICAL_DEBT.md).

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| PERF-001 | Performance | Analyzer Cache Optimization | Medium | Completed | — |
| PERF-002 | Performance | Eliminate Duplicate buildScoreContext Computation | Medium | Completed | — |

> PERF-003 (share `now` across the analysis/trend hooks to dedupe the trend's "current" point; optional Web Worker offload) is scoped but not yet registered — it needs a small UI-level change deliberately excluded from PERF-002.

---

## UX

AI Analytics user-experience fixes.

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| UX-001 | UX | Replace Full Page Reload with Analysis Re-run | Low | Completed | — |
| UX-002 | UX | Harden AI Analytics Retry & Error Handling | Medium | Completed | UX-001 |

> UX-002 fixed the synchronous-engine-throw hang (a sync throw now surfaces as an error state instead of leaving the page on `loading`) and made retry re-fetch the finance data before re-analysing. Remaining: surfacing store-level data-load errors as their own `ErrorState` — they currently fall through to the empty state — which is not yet a registered task.

---

## Gallery Scanner (GS)

Production Gallery Slip Scanner — the `MASTER_TASK.md` program, given its own **`GS`** epic to avoid colliding with the existing `OCR-001…007` Slip Scanner tasks (which stay unchanged). GS-001–GS-004 were delivered as design docs (architecture, roadmap, database, API/interfaces); GS-005+ are implementation. Full task briefs live in [MASTER_TASK.md](MASTER_TASK.md).

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| GS-001 | Gallery Scanner | Gallery Scanner System Architecture (design) | High | Completed | — |
| GS-002 | Gallery Scanner | Implementation Roadmap (design) | Medium | Completed | GS-001 |
| GS-003 | Gallery Scanner | Database Design (design) | High | Completed | GS-001 |
| GS-004 | Gallery Scanner | API & Interface Design (design) | High | Completed | GS-003 |
| GS-005 | Gallery Scanner | Gallery Permission Manager | High | Completed | — |
| GS-006 | Gallery Scanner | Gallery Scanner (auto scan) | Critical | Completed | GS-005 |
| GS-007 | Gallery Scanner | Scan Queue | High | Completed | GS-006 |
| GS-008 | Gallery Scanner | Scan Cache | High | Completed | GS-006 |
| GS-009 | Gallery Scanner | QR Detector | Critical | Completed | GS-007 |
| GS-010 | Gallery Scanner | EMVCo Payload Parser | Critical | Completed | GS-009 |
| GS-011 | Gallery Scanner | Bank Identification | High | Completed | GS-010 |
| GS-012 | Gallery Scanner | OCR Fallback | High | Completed | GS-009 |
| GS-013 | Gallery Scanner | Duplicate Detection | High | Completed | GS-010 |
| GS-014 | Gallery Scanner | Bank Selection Popup | Medium | Completed | GS-011 |
| GS-015 | Gallery Scanner | Import Preview | High | Completed | GS-013 |
| GS-016 | Gallery Scanner | Smart Import | High | Completed | GS-015 |
| GS-017 | Gallery Scanner | Security | High | Completed | GS-008 |
| GS-018 | Gallery Scanner | Performance Optimization | Medium | Completed | GS-007 |
| GS-019 | Gallery Scanner | AI Validation | Medium | Completed | GS-016 |
| GS-020 | Gallery Scanner | Scanner Analytics | Low | Completed | GS-016 |
| GS-021 | Gallery Scanner | Testing | High | Completed | GS-016 |
| GS-022 | Gallery Scanner | Final Review | Medium | Completed | GS-021 |
| GS-023 | Gallery Scanner | Smart Scan Scheduler | Medium | Completed | GS-006 |
| GS-024 | Gallery Scanner | Image Hash Engine | High | Completed | GS-008 |
| GS-025 | Gallery Scanner | Slip Validation Engine | High | Completed | GS-010 |
| GS-026 | Gallery Scanner | QR Recovery Engine | Medium | Completed | GS-009 |
| GS-027 | Gallery Scanner | Image Enhancement | Medium | Completed | GS-012 |
| GS-028 | Gallery Scanner | OCR Text Engine | High | Completed | GS-012 |
| GS-029 | Gallery Scanner | Slip Classifier | Medium | Completed | GS-010 |
| GS-030 | Gallery Scanner | Bank Template Engine | Medium | Completed | GS-011 |
| GS-031 | Gallery Scanner | Smart Duplicate Engine | Medium | Completed | GS-013 |
| GS-032 | Gallery Scanner | Import Conflict Resolver | Medium | Completed | GS-016 |
| GS-033 | Gallery Scanner | Background Worker | High | Completed | GS-007 |
| GS-034 | Gallery Scanner | Scan Progress Dashboard | Medium | Completed | GS-006 |
| GS-035 | Gallery Scanner | Import History | Medium | Completed | GS-016 |
| GS-036 | Gallery Scanner | Performance Monitor | Low | Completed | GS-018 |
| GS-037 | Gallery Scanner | Recovery System | Medium | Completed | GS-033 |
| GS-038 | Gallery Scanner | Security Audit | Medium | Completed | GS-017 |
| GS-039 | Gallery Scanner | Developer Tools | Low | Completed | GS-021 |
| GS-040 | Gallery Scanner | Production Readiness | Medium | Completed | GS-022 |
| GS-041 | Gallery Scanner | AI Slip Verification | Medium | Completed | GS-019 |
| GS-042 | Gallery Scanner | Fraud Detection Engine | Medium | Completed | GS-041 |
| GS-043 | Gallery Scanner | AI Transaction Categorization | Medium | Completed | GS-016 |
| GS-044 | Gallery Scanner | Merchant Intelligence | Medium | Completed | GS-043 |
| GS-045 | Gallery Scanner | Smart Learning Engine | Low | Completed | GS-043 |
| GS-046 | Gallery Scanner | Confidence Engine | Medium | Completed | GS-025 |
| GS-047 | Gallery Scanner | Transaction Linking | Low | Completed | GS-016 |
| GS-048 | Gallery Scanner | Spending Intelligence | Low | Completed | GS-043 |
| GS-049 | Gallery Scanner | AI Quality Review | Low | Completed | GS-019 |
| GS-050 | Gallery Scanner | Financial Intelligence Report | Low | Completed | GS-048 |

> GS-005 (Gallery Permission Manager) implemented as the permission foundation: a unified status model (granted/limited/prompt/denied/blocked/unavailable) spanning Android 13/14/15 + web, a native plugin contract (`registerPlugin`) that degrades gracefully until the on-device media plugin is wired, `useGalleryPermission` (denial + Settings-recovery flow), and the `READ_MEDIA_IMAGES`/`READ_MEDIA_VISUAL_USER_SELECTED` manifest permissions. Validated build/tsc/lint/test; native behaviour to be verified on-device.
>
> GS-006 (Gallery Scanner) implemented via the adapter architecture: a plugin-agnostic `MediaProvider` interface + `WebPickerProvider` (web) + `NativeMediaProvider` stub (native, wired later); `scanSessionService` orchestrates scan-all, incremental skip (by assetId), duplicate prevention (SHA-256 content hash), progress reporting, pause/resume/cancel, cooperative backgrounding, and session persistence/resume (Dexie v15 `slipScanRuns`/`slipScannedAssets`, device-local, unsynced) — with a `ScanProcessor` seam for the future extraction pipeline. `scanStore` + `useGalleryScan` drive it; the scanner imports no Capacitor/plugin. Validated build/tsc/lint (10 tests); native enumeration to be verified on-device.
>
> GS-007 (Scan Queue) added the concurrent worker pool under the orchestration: `runConcurrentQueue` (N self-balancing workers pulling lazily from the provider stream — the source is the backpressure, nothing is buffered), bounded retries with linear backoff, and a `ByteBudget` semaphore that caps total in-flight image bytes (memory protection + dynamic batching by image size). `scanSessionService` now runs through the queue with a synchronous within-run content-dedup Set (race-free under concurrency, alongside the cross-run DB check); concurrency is device-derived (`resolveConcurrency`) and overridable via `ScanOptions`. Cursor advances only on a clean finish; interruption resumes via assetId dedup. Full suite green (1716 tests).
>
> GS-008 (Scan Cache) upgraded the GS-006 store into a versioned production cache (Dexie v16 `slipScanCache`, replacing `slipScannedAssets`) behind a `ScanCache` interface — so the orchestration and queue stay independent of the cache implementation (`dexieScanCache`, injectable/fakeable). Entries carry lastModified + status + OCR/payload/parser versions + failure count. Behaviour: skip-unchanged (cache hit), re-scan changed (lastModified) and stale (version bump — the `hasContent` check excludes an asset's own entry so identical content still re-scans), remembered failures retried across runs up to a policy limit then skipped, plus `invalidate`/`clear`. Engine versions are placeholder `0` until extraction (GS-009+) defines real ones. Full suite green (1724 tests).
>
> GS-009 (QR Detector) added the first extraction stage behind a swappable `QrDecoder` interface, so detection logic and the jsQR backend stay decoupled and the logic is unit-testable with a fake decoder: `createQrDetector` runs a decoder over image bytes and returns `{ hasQr, payload }` — non-QR images resolve to `hasQr:false` rather than throwing, so a whole-gallery scan flows past photos that aren't slips. The concrete `imageDataQrDecoder` (jsQR@1.4.0, pure-JS) decodes via createImageBitmap → OffscreenCanvas → ImageData and degrades to null outside a browser/WebView; jsQR is referenced only there. The raw payload is returned verbatim — no parsing (EMVCo interpretation is GS-010). `createQrScanProcessor` plugs QR detection into the existing GS-006 `ScanProcessor` seam without changing orchestration; it is not yet the default processor since the payload has no consumer until GS-010. Validated build/tsc/lint; slipScanner 32 tests, full suite green.
>
> GS-010 (EMVCo Payload Parser) turns a raw QR payload string into a structured payment record. `engine/emvco/emvcoTlv.ts` is a pure Tag-Length-Value walker: it parses the flat EMVCo field stream, recurses into template tags (merchant-account 02–51, additional-data 62, language 64), gracefully keeps a template's raw value when its content isn't nested TLV (e.g. a card-scheme GUID), and returns null for non-EMVCo strings (a URL/plain-text QR is cleanly rejected). Integrity is the CRC-16/CCITT-FALSE checksum in tag 63 (`crc16ccitt`, pinned by the canonical `123456789`→`0x29B1` vector); `parseEmvcoPayload` reports it as `crcValid` and still parses a structurally-valid-but-corrupted payload rather than discarding it. `emvcoPayloadParser.ts` extracts the standard fields — PromptPay AID + proxy (mobile/national-id/e-wallet), merchant name/city, MCC, amount, currency (numeric + a small ISO-4217 alpha map), country, and reference IDs from the additional-data template. Two deliberate deferrals (no invention): bank *identity* is left to GS-011 (the raw `merchantAccounts` templates are exposed for it), and timestamp is left to OCR/slip-verify (GS-012) since EMVCo payment QRs carry none. Validated build/tsc/lint; slipScanner 49 tests, full suite green.
>
> GS-011 (Bank Identification) is a plugin-based institution identifier over the GS-010 payload. `engine/bank/bankRegistry.ts` seeds a mutable registry with the listed institutions keyed on the real, published Bank of Thailand 3-digit codes (BBL 002, KBank 004, Krungthai 006, TTB 011, SCB 014, UOB 024, Krungsri 025, GSB 030, BAAC 034) plus PromptPay as a rail (code null) — no codes are guessed. `registerBankPlugin` adds or replaces a bank by id, so future banks plug in without editing the identifier; `identifyBankByCode` is the reusable code→bank resolver other stages (OCR/slip-verify) call. `bankIdentifier.ts`'s `identifyBank(payload)` prefers a registered plugin whose custom `match` or `aidGuids` (bank-specific QR rails) fits, then falls back to the PromptPay rail when the payload carries a PromptPay proxy, else null — honest about the fact that a plain PromptPay QR identifies the rail, not the receiving bank (only known later from slip verification/OCR). Validated build/tsc/lint; slipScanner 58 tests, full suite green.
>
> GS-012 (OCR Fallback) recovers slip fields when the QR path can't. It reuses the app's existing on-device OCR rather than adding a second engine: `engine/ocr/ocrRecognizer.ts` exposes a byte-oriented `OcrTextRecognizer` seam whose default wraps the existing Tesseract `recognizeSlipText` (dynamic import, so the WASM engine stays out of the path/bundle until a slip needs it), and `slipOcrFields.ts` reuses `parseSlipText` verbatim for amount/date/merchant — adding only the two fields that parser lacks, transaction time (HH:MM[:SS], range-validated) and reference number (Thai/English label-anchored). `ocrFallback.ts`'s `shouldRunOcrFallback(qrOutcome)` enforces the "OCR only when QR missing/damaged/unreadable" rule: it runs OCR when no QR was detected, when a decoded QR isn't valid EMVCo, or when the CRC fails — and skips it for a clean CRC-valid payload. Logic is unit-testable via a fake recognizer (no Tesseract in tests). Not yet wired as the default processor; assembled into the extraction pipeline in a later GS task. Validated build/tsc/lint; slipScanner 70 tests, full suite green.
>
> GS-013 (Duplicate Detection) prevents importing the same *transaction* twice — distinct from the image-byte content-hash dedup the orchestration already does (which only prevents scanning the same *file* twice). `engine/dedup/slipDuplicate.ts`'s `slipDuplicateKey(fields)` builds a deterministic fingerprint from the fields a slip carries (payload, ref1/ref2, amount, timestamp, merchant, bank): a reference number is the authoritative key when present (so the same transaction seen via QR and via OCR collapses to one, and cosmetic dash/space formatting is normalised away), otherwise it falls back to the full field tuple — which correctly keeps distinct payments to the same static PromptPay QR (identical payload, different amount/time) separate. `createDuplicateDetector(seedKeys?)` holds a seen-key set with `isDuplicate`/`register` and an atomic `markSeen` (race-free has()+add() under the concurrent queue, per the GS-007 pattern); it can be seeded with already-imported keys to block re-imports, and never flags a slip that carries no dedup signal. Pure/in-memory — persistence wiring is left to the import task. Validated build/tsc/lint; slipScanner 77 tests, full suite green.
>
> GS-014 (Bank Selection Popup) is the pre-scan popup that picks which banks' slips to import. Business logic stays out of React: `selection/bankSelection.ts` (pure) supplies the bank list from the pluggable registry, search filtering, an immutable toggle, the quick-select preset, and a scan-time estimate (image count × a documented per-image heuristic); `store/bankSelectionStore.ts` is a zustand `persist` store that *remembers the previous selection* (a `chosen` flag distinguishes "never picked → default to all" from "explicitly deselected all"); `hooks/useBankSelection.ts` composes them (search, select-all/deselect-all/quick-select, counts, estimate) and `components/BankSelectionPopup.tsx` is a thin presentational layer reusing the shared `Drawer`, with new i18n keys under `slipScanner.bankSelect.*` (en+th). Displays estimated image count + scan time; Start-scan is disabled until at least one bank is chosen. Not yet mounted on a route (the scanner UI is assembled in later GS tasks). Validated build/tsc/lint; slipScanner 97 tests (added bankSelection/store/hook/component suites), full suite green.
>
> GS-015 (Import Preview) introduces the unified `SlipCandidate` model (`models/slipCandidate.ts`) — one record per scanned slip carrying thumbnail, bank, amount, currency, date, time, merchant, reference, payload, source (qr/ocr), duplicate status and a confidence score — and `buildSlipCandidate()` that assembles it from the extraction-stage outputs (EMVCo GS-010, bank GS-011, OCR GS-012, dedup GS-013). It trusts EMVCo fields only when the QR checksum is valid, otherwise falls back to OCR entirely (keeping the raw payload for reference); `basicConfidence()` is a transparent completeness/source heuristic (0–100) later refined by the Confidence Engine (GS-046). `preview/importPreview.ts` (pure) does the free-text search (merchant/reference/bank/amount) and duplicate/bank filtering; `hooks/useImportPreview.ts` owns selection state (defaulting to every non-duplicate, resetting on a new scan via React's adjust-state-during-render pattern) with select-all-visible / deselect-all / toggle; `components/ImportPreview.tsx` reuses the shared `Drawer` to list candidates (thumbnail, bank, amount, date/time, merchant, duplicate badge, confidence, source) with search, an all/unique/duplicates filter, and an Import-Selected action, i18n under `slipScanner.importPreview.*` (en+th). The image→candidate pipeline (decode + run engines) is wired in GS-016. Validated build/tsc/lint; slipScanner 115 tests, full suite green.
>
> GS-016 (Smart Import) turns selected `SlipCandidate`s into transactions. `import/candidateToTransaction.ts` (pure) maps a slip to a completed expense (bank + reference into the note, date falling back to an injectable today); `import/smartImport.ts` is a persistence-agnostic batch importer behind an injectable `SmartImportDeps` (create returns the new id, delete for rollback): it reports per-item **progress**, is **resilient by design** (a bad amount or a create error is recorded in `failed` and the batch continues — **error recovery** — rather than aborting), supports cooperative **cancellation** and **resume** (skips already-imported candidate ids), and ships `rollbackImport(importedIds)` to **undo** a run. `import/smartImportDeps.ts` wires the real `transactionService` (same CRUD the finance module already uses — no new data path); `hooks/useSmartImport.ts` runs the batch, tracks progress/result, refreshes the transaction store once after the batch (not per row), and exposes `undo`. Persistence is injected in tests, so no Dexie is touched there. Not yet mounted on a route — the scanner→preview→import flow is assembled behind a UI entry point in a later GS task. Validated build/tsc/lint; slipScanner 126 tests, full suite green.
>
> GS-017 (Security) adds the scanner's security utilities, reusing existing integrity primitives rather than inventing an encryption layer for data the scanner deliberately doesn't persist in plaintext (the scan cache holds only asset ids / hashes / versions — a structurally "secure cache"). `security/scanAuditLog.ts` is an append-only, bounded (200-event) audit trail for **permission** and **import** events, recording only non-sensitive metadata (statuses, counts, ids) with an injectable sink (best-effort — a throwing sink never breaks scanning) and clock. `security/secureDeletion.ts` handles **secure deletion** of transient artifacts: `wipeBytes` zero-fills a decoded-image buffer once used, and `revokeThumbnails`/`secureDiscardCandidates` release the object-URLs backing thumbnails (which otherwise keep the Blob alive) — `revoke` injectable for tests. `security/tamperDetection.ts` does **tamper detection** grounded in the real EMVCo CRC (`detectPayloadTamper` → `crc-mismatch`) plus a replayed-slip signal (`isReplayedSlip`: a duplicate QR slip) and a non-positive-amount sanity check. All pure/isolated (no shared-file edits). Validated build/tsc/lint; slipScanner 137 tests, full suite green.
>
> GS-018 (Performance Optimization) adds the observability layer for the 50,000-image target. The mechanisms that make that scale viable already exist — lazy provider enumeration (GS-006, nothing buffered), the ByteBudget-bounded concurrent queue (GS-007, caps in-flight memory + parallelism), and the versioned skip-unchanged cache (GS-008, incremental re-scans) — so rather than redesign them, `perf/scanMetrics.ts` *measures* them so the target can be validated and tuned: `createScanMetrics()` records cache decisions, scanned bytes, failures, duplicates and observed in-flight bytes, and its `snapshot()` derives cache-hit ratio, incremental skip ratio, throughput (images/sec), average image size and peak in-flight memory — counters only, no image data, injectable clock. Validated build/tsc/lint; slipScanner 141 tests, full suite green.
>
> GS-019 (AI Validation) is the scanner's advisory pre-import validation — the app's local, rule-based "AI" (the LLM Gateway stays unwired), so it is fully deterministic. Hard contract: it **never modifies the candidate**, only returns findings (a test asserts input immutability). `validation/slipValidation.ts`'s `validateSlipCandidate()` verifies the listed fields: amount (missing / non-positive → error; implausibly large → warning), merchant (missing → warning), date (missing / in-the-future → warning, with an injectable today), duplicate probability (0.9 when the dedup engine flagged it, else 0.1 — refined into a graded score by the Smart Duplicate Engine GS-031) with a possible-duplicate warning, and confidence (below a threshold → warning). `valid` is true when there are no error-severity issues; `validateSlipCandidates()` batches by id. Validated build/tsc/lint; slipScanner 148 tests, full suite green.
>
> GS-020 (Scanner Analytics) accumulates usage stats **across** scan runs over time — distinct from GS-018's per-run in-memory perf metrics — adding the QR/OCR/import dimensions the task lists. `analytics/scannerAnalytics.ts` (pure) defines `ScannerRunStats`, `mergeRun` (immutable fold, increments run count) and `deriveAnalytics` (duplicate rate, QR-detection rate, OCR-usage rate, cache-hit rate, import-success rate, average scan speed images/sec + ms/image — all zero-safe); `store/scannerAnalyticsStore.ts` is a zustand `persist` store holding the aggregate counters (no slip content) across sessions; `hooks/useScannerAnalytics.ts` exposes the derived analytics + `recordRun`/`reset`. Validated build/tsc/lint; slipScanner 155 tests, full suite green.
>
> GS-021 (Testing) closes the critical-path coverage the per-stage unit tests (GS-009…GS-020) left open, adding the higher-level categories under `__tests__/`: `pipeline.integration.test.ts` composes the *real* engine stages end-to-end — QR detect → EMVCo parse → bank identify → OCR fallback → candidate build → duplicate detect → validate → smart import (+ rollback) — with only image decoding and persistence faked, proving the pieces fit together (a QR slip resolves to a PromptPay candidate, a non-QR photo falls back to OCR, a re-scanned slip is caught as a duplicate and excluded from import). `scanSession.stress.test.ts` is the stress/memory test: it drives the real orchestration over 600 lazily-enumerated assets and asserts everything is processed while in-flight parallelism stays bounded by the configured concurrency (the memory-protection property the 50k target relies on). Validated build/tsc/lint; slipScanner 159 tests, full suite green.
>
> GS-022 (Final Review) is the module-wide review + doc-sync checkpoint for the GS-005…GS-021 build. Full gate run clean: `tsc -b` ✓, `oxlint src` ✓, `npm run build` ✓, full test suite green (159 slipScanner tests within it). Review findings: **Architecture** — every stage sits behind a swappable interface (`MediaProvider`, `ScanCache`, `QrDecoder`, `OcrTextRecognizer`, `SmartImportDeps`, `BankPlugin`), so nothing is coupled to a plugin/backend and each unit is fakeable; business logic stays out of React (pure modules + hooks + thin components), per project rules. **Security** — no plaintext financial data is persisted (the cache holds only ids/hashes/versions); audit, CRC-based tamper detection, and secure deletion are in place. **Performance** — lazy enumeration + bounded byte-budget queue + versioned skip-cache give the 50k headroom, with a metrics layer to measure it. **Accessibility** — the two UI surfaces reuse the shared `Drawer` and label their controls; deeper a11y review deferred until they are mounted on a route. **Maintainability** — consistent folder-per-concern layout, high test density (159 tests), no business logic in components. Open items recorded in [TECHNICAL_DEBT.md](../docs/TECHNICAL_DEBT.md): the `NativeMediaProvider` stub (no on-device enumeration yet) and the not-yet-mounted UI, plus placeholder engine versions / heuristic confidence (GS-046). Docs synced: ROADMAP, CHANGELOG, TECHNICAL_DEBT, this registry.
>
> **Live wiring (post-GS-022)** — the scanner is now user-facing on web via a "Scan Gallery" button on the Transactions page (`GalleryScanFlow`): bank selection → image picker → real jsQR + Tesseract extraction (`extractSlipCandidate` + `useSlipScan`) → Import Preview → Smart Import. Native gallery picking wired via `@capacitor/camera` `pickImages` (guarded); the Android build was enabled (cap sync + Gradle foojay JDK-21 auto-provisioning) and a debug APK built + installed on-device. Full-gallery *auto*-enumeration remains a stub.
>
> GS-023 (Smart Scan Scheduler) — `schedule/scanScheduler.ts` `decideScan(trigger, config, device, lastScanAt)` (pure): a manual scan always runs; automatic (startup/scheduled) scans honour an enabled switch, a startup toggle, a minimum interval, and battery/charging gates (low-battery/not-charging, never gating when battery is unknown). Not rescanning previously-scanned images is delegated to the incremental cache (GS-008). `schedule/deviceState.ts` reads battery via the web Battery API (nulls when unknown); `store/scanScheduleStore.ts` persists config + last-scan time. Validated build/tsc/lint; 7 tests.
>
> GS-024 (Image Hash Engine) complements the exact SHA-256 content hash (GS-006, reused) with a perceptual hash for near-duplicate/modified-image detection. `engine/hash/perceptualHash.ts` (pure) is a DCT-based 64-bit pHash over a 32×32 grayscale block (`computePHash`) plus `hammingDistanceHex`/`arePerceptuallySimilar`; `engine/hash/imageHash.ts` `hashImage(bytes)` returns `{ sha256, pHash }`, computing pHash via the browser image pipeline (null off-browser). Consumed by the Smart Duplicate Engine (GS-031). Validated build/tsc/lint; 8 hash tests.
>
> GS-025 (Slip Validation Engine) `validation/slipValidationEngine.ts` `validateSlip(input)`: rigorous deterministic validation of EMVCo format (CRC), PromptPay payload (AID), and the amount/timestamp/merchant/reference *formats* (bounds, regex, EMVCo length limits, future-date check), producing per-field validity + a weighted 0–100 confidence and an overall `valid`. Works for QR slips (payload) and OCR slips (fields). Distinct from GS-019's advisory warnings; feeds the Confidence Engine (GS-046). Validated build/tsc/lint; 5 tests.
>
> GS-026 (QR Recovery Engine) `engine/qr/qrRecovery.ts` `recoverQr(bytes)`: decode the original, and on failure automatically retry over transformed variants until one yields a QR, reporting `recoveredBy` + `attempts`. `engine/qr/imageVariants.ts` `browserImageVariants` generates rotate-90/180/270, brighten, contrast and upscale variants via canvas (rotated/dark/faded/low-res recovery), yielding nothing off-browser. Orchestration is pure/testable with a fake decoder + variant generator; `maxAttempts` bounds the retries. Validated build/tsc/lint; 6 tests.
>
> GS-027 (Image Enhancement) preprocesses "only when necessary". `engine/image/imageEnhancement.ts` (pure) `planEnhancements(stats)` decides corrections from brightness/contrast stats (brighten dark, dim blown-out, boost + sharpen low-contrast; grayscale alongside corrections) and `isEnhancementNeeded` leaves a healthy image untouched; `enhancementFilterString` builds the canvas filter. `engine/image/imageEnhancer.ts` `analyzeImage` (64×64 luma mean/std) + `enhanceIfNeeded(bytes)` apply the plan via canvas filter + a 3×3 sharpen convolution, returning the originals when nothing's needed/off-browser. Auto-rotate is covered by GS-026; auto-crop deferred. Validated build/tsc/lint; 4 tests.
>
> GS-028 (OCR Text Engine) `engine/ocr/ocrTextEngine.ts` `extractOcrText(text)`: per-field extraction with a confidence for every field — amount, date, time, merchant, sender, receiver, reference. Reuses GS-012's field extraction (no duplicated regex) and adds label-anchored sender/receiver; deterministic confidence (label-anchored fields score higher, absent fields 0). Validated build/tsc/lint; 2 tests.
>
> GS-029 (Slip Classifier) `engine/classify/slipClassifier.ts` `classifySlip(input)`: identifies the slip type — promptpay / bank-slip / transfer / deposit / withdrawal / bill-payment / unknown — from the EMVCo AID (PromptPay credit vs bill-payment) and OCR-text keywords (Thai + English), most-specific-first, returning `unknown` rather than guessing. Validated build/tsc/lint; 5 tests.
>
> GS-030 (Bank Template Engine) `engine/bank/bankTemplateRegistry.ts`: per-bank template (brand-approximate primary colour + on-primary, an initials logo placeholder — no bundled logo assets, OCR label hints, and a `parserId`) behind a registry seeded for the GS-011 institutions. `registerBankTemplate` adds/replaces by bankId (future banks plug in without editing business logic; missing fields fall back to shared defaults), `getBankTemplate`/`getAllBankTemplates`/`resetBankTemplates`. OCR labels are a shared default (no per-bank specimens invented). Validated build/tsc/lint; 4 tests.
>
> GS-031 (Smart Duplicate Engine) `engine/dedup/smartDuplicate.ts` `duplicateProbability(a, b)`: a graded 0–1 probability refining GS-013's binary key, comparing QR payload, reference (format-normalised), amount, merchant, timestamp and image pHash (GS-024). Independent signals combine via noisy-OR (any strong signal → high probability; weak signals reinforce), returning the matched signal names; `isLikelyDuplicate` (threshold) and `findBestDuplicate` (best match in a list). Validated build/tsc/lint; 7 tests.
>
> GS-032 (Import Conflict Resolver) `import/conflictResolver.ts`: replace / skip / merge / keep-both reconciliation for an incoming slip that duplicates an existing transaction. `defaultResolution(probability)` (skip near-certain, keep-both otherwise); `resolveBatch(conflicts, { applyToAll?, overrides? })` supports batch (one choice for all) and per-candidate overrides; `partitionDecisions` groups by action; `mergeCandidate(existing, candidate)` fills only gaps (time, bank/reference note) without overwriting user-edited values. Validated build/tsc/lint; 6 tests.
>
> GS-033 (Background Worker) `worker/backgroundWorker.ts` `createBackgroundWorker(options)`: a general enqueue-able task queue with bounded concurrency, retry+backoff, pause/resume, cancellation, and a `whenDrained()` promise. Tasks run off the render path (microtasks/timers) so the UI thread is never blocked; `onSettled` reports each outcome (ok/error/attempts). Distinct from GS-007's stream-pull scan queue — this accepts arbitrary jobs enqueued over time. Validated build/tsc/lint; 5 tests (incl. concurrency bound + pause/resume).
>
> GS-034 (Scan Progress Dashboard) `progress/scanProgress.ts` `computeScanProgress(counts, startedAt, now)` (pure): derives speed (images/sec), remaining, ETA and percent from raw counters + elapsed time (null-safe when total/elapsed unknown), plus `formatEta`. `components/ScanProgressDashboard.tsx` renders the live metrics (scanned/QR/OCR/imported/remaining/speed/ETA) + an ARIA progress bar from a snapshot; i18n under `slipScanner.progressDashboard.*` (en+th). Real-time updates come from the parent recomputing the snapshot. Validated build/tsc/lint; 5 tests.
>
> GS-035 (Import History) persists one record per Smart Import run — date, source, bank, amount, status, duration, errors — in the additive Dexie table `slipImportHistory` (v17, device-local/unsynced). `models/importHistory.ts` (types + `deriveImportStatus`), `repositories/importHistoryRepository.ts` (add/list-newest-first/clear, direct-`db.table` like scanRunRepository), and `history/importHistoryFilter.ts` (pure filter+search by status/bank/date-range/free-text). Validated build/tsc/lint; slipScanner 233 tests (v17 migration confirmed safe).
>
> GS-036 (Performance Monitor) `perf/performanceMonitor.ts` `createPerformanceMonitor(now?)`: per-stage runtime timing (QR/OCR/scan) via `time(stage, fn)`/`record`, cache-hit ratio, and memory sampling (`performance.memory` where available, else null). Reports per-stage count/avgMs/perSec. CPU% isn't readable in browser JS, so it's represented honestly by per-stage throughput rather than a fabricated percentage. Complements GS-018 (per-run counters) and GS-020 (cross-run analytics). Validated build/tsc/lint; 4 tests.
>
> GS-037 (Recovery System) `recovery/recoverySystem.ts`: on startup, `detectRecovery()` finds a left-over running/paused scan run (via `scanRunRepository.getResumable`, GS-006) and a failed/partial last import (GS-035 history); `planRecovery(state)` (pure) turns that into ordered actions (`resume-scan` / `retry-import` / `none`). Execution reuses createScanSession's cursor resume and Smart Import's skipCandidateIds. Validated build/tsc/lint; 4 tests.
>
> GS-038 (Security Audit) `security/securityAudit.ts` extends the GS-017 audit log with `validation` + `suspicious` event types and recorders for deletions / failed validations / suspicious activity (on top of permission/import), plus `getSecurityEvents()` (the security slice, excluding routine scan events) and `summarizeSecurityAudit()` (counts by type). Stores only non-sensitive metadata like the base log; encrypted-at-rest persistence is a matter of wiring the base log's injectable sink. Validated build/tsc/lint; 3 tests.
>
> GS-039 (Developer Tools) `devtools/scannerDevTools.ts`: dev-gated helpers — `isScannerDevMode()`/`runInDev(fn, dev?)` (guards to `import.meta.env.DEV`, injectable flag for tests), `exportScannerLogs(extra?)` (audit trail + profiling payload → JSON), and `buildValidationReport(candidates)` (aggregates valid/invalid + issue-code counts via GS-019). Validated build/tsc/lint; 3 tests.
>
> GS-040 (Production Readiness) — production review + doc sync for the GS-023…GS-039 refinement wave (on top of the GS-005…GS-022 core + the live web wiring). Full gate clean: `tsc -b` ✓, `oxlint src` ✓, `npm run build` ✓, full suite **1945/1946** (the single failure was the pre-existing `TradingDashboard.integration` synchronous-assertion flake under parallel load — passes 4/4 in isolation, unrelated to the GS work). Review: **Architecture** — every refinement engine is pure logic or sits behind a swappable interface / injectable dep, folder-per-concern, business logic out of React. **Security** — no plaintext financial data persisted (cache/history hold ids/hashes/counts); audit + security-audit + tamper detection + secure deletion in place. **Performance** — lazy enumeration + bounded queue + versioned cache, now with per-run metrics (GS-018), cross-run analytics (GS-020) and per-stage timing (GS-036). **Accessibility** — the mounted UI (Scan Gallery flow, dashboards) reuses the shared `Drawer`, labels controls, and uses an ARIA progress bar. **UX** — bank select → preview → import with progress + rollback + conflict resolution. **Maintainability/Docs** — high test density (~280 slipScanner tests), ROADMAP/CHANGELOG/TECHNICAL_DEBT/SECURITY synced. Open items: full-gallery auto-enumeration (NativeMediaProvider stub) and the AI layers (GS-041–GS-050). ENGINEERING_AUDIT.md does not exist in the repo; the review is recorded here instead.
>
> GS-041 (AI Slip Verification) `ai/slipVerification.ts` `verifySlip(input)`: cross-checks the QR-derived and OCR-derived views (amount/merchant/reference, only when both sides have a field) plus CRC/bank/timestamp signals, producing deterministic authenticity / confidence / risk scores (0–100) with explicit reasons (crc-invalid, amount/merchant/reference-mismatch, timestamp-invalid). Advisory only — never mutates imported data. Validated build/tsc/lint; 4 tests.
>
> GS-042 (Fraud Detection Engine) `ai/fraudDetection.ts` `detectFraud(input)`: combines CRC validity, verification risk (GS-041), amount mismatch, duplicate probability (GS-031), future-timestamp and screenshot signals into a weighted 0–100 score and a Low/Medium/High level, with named reasons (invalid-payload, duplicate-reuse, suspicious-ocr-mismatch, impossible-timestamp, edited-slip, fake-screenshot). Deterministic, advisory (flags only). Validated build/tsc/lint; 6 tests.
>
> GS-043 (AI Transaction Categorization) `ai/transactionCategorizer.ts` `categorize(text, learned?)`: deterministic keyword rules (Thai + English, most-specific-first) mapping a merchant/title to one of the 10 categories, with **learned user corrections taking precedence** (confidence 1.0). `store/categoryLearningStore.ts` (zustand persist) stores corrections keyed by normalised merchant and feeds them back as a Map — all local, no cloud. Unmatched → Others (low confidence). Validated build/tsc/lint; 7 tests.
>
> GS-044 (Merchant Intelligence) `ai/merchantIntelligence.ts` `buildMerchantProfiles(txns)`: merges alias/duplicate spellings (`normalizeMerchant`), groups chains by a brand key (`merchantKey` = first token), and produces profiles with display name, distinct aliases (location variants), `isChain`, spending frequency (count), total/average, and first/last seen — sorted by frequency. Pure/deterministic; the first-token chain heuristic is documented (generic tokens could over-group; `merchantKey` is exposed to override). Validated build/tsc/lint; 4 tests.
>
> GS-045 (Smart Learning Engine) unifies local, no-cloud learning of user corrections. `learning/applyLearning.ts` (pure): `applyMerchantMapping` (raw→corrected, normalised key), `applyOcrCorrections` (learned wrong→right text fixes, longest-first), `applyBankNaming` (bankId→preferred name). `store/learningStore.ts` (zustand persist) holds the merchant/OCR/bank-naming maps with learn methods; preferred-category learning lives in `categoryLearningStore` (GS-043). Validated build/tsc/lint; 7 tests.
>
> GS-046 (Confidence Engine) `ai/confidenceEngine.ts` `combineConfidence(inputs, weights?)`: combines the per-stage confidences — QR, parser, OCR, AI validation, bank template — into one overall 0–100 score with a breakdown. Only signals actually present are weighted (weights renormalise over them), so a QR-only or OCR-only slip still scores fairly; inputs are clamped 0–1. Refines GS-015's `basicConfidence`. Validated build/tsc/lint; 4 tests.
>
> GS-047 (Transaction Linking) `ai/transactionLinking.ts` `linkTransactions(txns)`: deterministic detection of related transactions as a directed relationship graph — refund (matches a prior expense's merchant+amount), transfer+fee (small same-day fee), installment (3+ same merchant+amount), split-payment (2+ same merchant+day), cashback (small income within 3 days of an expense). Advisory (proposes links, doesn't alter data); edges deduped. Validated build/tsc/lint; 6 tests.
>
> GS-048 (Spending Intelligence) `ai/spendingIntelligence.ts` `generateSpendingInsights(txns)`: deterministic insights with plain-language explanations — top spending category, most-frequent merchant, month-over-month trend (warning when up >20%), and abnormal expenses (robust `> 3× median` rule, which — unlike mean+Nσ — a single huge expense can't inflate its own cutoff). Advisory. Validated build/tsc/lint; 4 tests.
>
> GS-049 (AI Quality Review) `ai/qualityReview.ts` `reviewImportQuality(items)`: reviews imported/about-to-import items for missing data, suspect OCR, uncategorised (Others), low confidence (<50), and duplicate risk (≥0.7), returning per-item findings with a combined recommendation; clean items are omitted. Advisory. Validated build/tsc/lint; 4 tests.
>
> GS-050 (Financial Intelligence Report) — the capstone. `ai/financialIntelligenceReport.ts` `buildFinancialIntelligenceReport(input)` aggregates the engine outputs into one report (import accuracy, OCR accuracy, AI confidence, fraud summary, duplicate summary + rate, top-merchant analysis, spending insights), with `reportToJson`/`reportToCsv` serialisers (metric + merchant + insight sections). PDF export reuses the app's existing jspdf infrastructure (the report supplies the data), so no PDF logic is duplicated. **This completes the GS epic (50/50).** Full slipScanner suite: 297 tests. Validated build/tsc/lint; 4 tests.

---

## Platform (PLT)

Cross-cutting platform frameworks from `MASTER_TASK.md`. Handled per the reuse rule (`CLAUDE.md`) and the user's decision to **implement only the genuinely-new frameworks**: **PLT-002 Event Bus, PLT-008 Feature Flags, PLT-018 Command Palette, PLT-019 Local Telemetry** are implemented as new modules under `src/platform/` (21 tests); the rest are **satisfied by existing app/GS systems** (Global Search, AI Gateway, import/export, notifications, settings, audit, AI memory, background worker…) or specified **design-only** (Plugin SDK). The full per-item design & reuse map is in [Platform/PLATFORM_DESIGN.md](Platform/PLATFORM_DESIGN.md). Only PLT-020 (certification) remains.

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| PLT-001 | Platform | Plugin SDK (design) | Medium | Completed | — |
| PLT-002 | Platform | Event Bus | High | Completed | — |
| PLT-003 | Platform | Background Task Engine | High | Completed | PLT-002 |
| PLT-004 | Platform | File Import Framework | Medium | Completed | PLT-001 |
| PLT-005 | Platform | Export Framework | Medium | Completed | PLT-001 |
| PLT-006 | Platform | Notification Center | Medium | Completed | PLT-002 |
| PLT-007 | Platform | Audit Log | Medium | Completed | — |
| PLT-008 | Platform | Feature Flags | Low | Completed | — |
| PLT-009 | Platform | Settings Framework | Medium | Completed | — |
| PLT-010 | Platform | Configuration Manager | Medium | Completed | PLT-009 |
| PLT-011 | Platform | Global Search | Medium | Completed | — |
| PLT-012 | Platform | Filter Engine | Medium | Completed | — |
| PLT-013 | Platform | Table Engine | Medium | Completed | PLT-012 |
| PLT-014 | Platform | Dashboard Framework | Medium | Completed | PLT-015 |
| PLT-015 | Platform | Widget SDK | Medium | Completed | PLT-001 |
| PLT-016 | Platform | Local AI Gateway | High | Completed | — |
| PLT-017 | Platform | AI Memory | Medium | Completed | PLT-016 |
| PLT-018 | Platform | Command Palette | Medium | Completed | PLT-011 |
| PLT-019 | Platform | Local Telemetry | Low | Completed | — |
| PLT-020 | Platform | Platform Certification | Medium | Completed | — |

> PLT-020 (Platform Certification) — final platform review + doc sync, completing the MASTER_TASK program (GS 50/50 + PLT 20/20). Full gate clean: `tsc -b` ✓, `oxlint src` ✓, `npm run build` ✓, full suite **2016/2017** (the one failure is the pre-existing `TradingDashboard.integration` synchronous-assertion flake under parallel load — passes 4/4 in isolation, unrelated to this work). Review: **Architecture** — new platform modules live under `src/platform/` behind small interfaces; the scanner is folder-per-concern with swappable seams; business logic stays out of React. **Security** — no plaintext financial data at rest; audit + tamper detection + secure deletion; telemetry never leaves the device; AI layers are advisory (never mutate data). **Performance** — lazy enumeration + bounded queue + versioned cache + metrics/telemetry. **Testing** — ~297 slipScanner + 21 platform tests within a 2017-test suite. **Accessibility** — mounted UI reuses the shared `Drawer`, ARIA progress bar, labelled controls; deeper audit of the command palette deferred. **Maintainability/Docs** — ROADMAP/CHANGELOG/TECHNICAL_DEBT/SECURITY + [Platform/PLATFORM_DESIGN.md](Platform/PLATFORM_DESIGN.md) synced. Open items (forward work): full-gallery native auto-enumeration (`NativeMediaProvider` stub) and on-device verification of the native picker. ENGINEERING_AUDIT.md does not exist in the repo; the certification is recorded here.

---

## Gallery Scanner — Post-Launch Stabilization (post-PLT-020)

Not new MASTER_TASK items — real on-device use of the shipped scanner (the open item PLT-020 flagged) surfaced bugs, which were fixed as they were found, followed by two code-review passes over the whole QR/OCR pipeline. Recorded here rather than as new GS/PLT ids since the epic itself is unchanged (still 50/50 + 20/20).

> **On-device bug-fix round** (`a71d6cb`, `343f162`, `9d95994`, `7b9013f`, `ee45134`, `1e59da6`, `dfcc096`) — the native picker (PLT-020's open item) was verified on-device and several real-slip failures were found and fixed: a QR-decode canvas-fallback bug that silently broke on-device decoding (some Android WebViews lack `OffscreenCanvas`, so `imageDataQrDecoder`/`qrRecovery` gained a DOM `<canvas>` fallback); an amount-extraction bug picking the wrong 2-decimal number off a slip ("20 → 520") fixed by anchoring to a currency marker or amount label; "Unknown bank" on real slips (Thai completed slips carry a *slip-verification* QR, not an EMVCo payment QR, so `identifyBankFromText` was added as an OCR-text fallback, earliest-keyword-wins so the payer's own bank beats a bank name embedded in a merchant string); imported-row quality (title/category/grammar, full-resolution + max-quality gallery image picking for OCR); and `slipParser.ts` merchant extraction extended from shop-keyword matching to positional extraction (name/bank/account → payee) so label-less e-wallet/person/top-up payees (e.g. a PromptPay/G-Wallet top-up) resolve to the payee's name instead of falling back to the bank name.
>
> **Code-review pass 1** (`dbe4ca2`) — a 10-agent parallel review of the whole QR/slip-scanning system, then fixed: `identifyBank()` could never match a real (non-PromptPay) bank from EMVCo (no `aidGuids`/`match` were ever populated for the real-bank registry entries) — now falls back to OCR-text identification when a clean EMVCo payload still leaves the bank unresolved; the category-learning store (GS-045/043) was fully disconnected from the import flow — wired (read side) into `candidateToTransaction`/`GalleryScanFlow`, and the guessed category is now validated against the user's live category list (falls back to "Others" rather than persisting a category that doesn't exist, e.g. the categoriser's "Healthcare"/"Bills" vs. the app's default-seeded "Health"/"Utilities"); a `??` vs `||` inconsistency silently broke category fallback on an empty merchant; OCR preprocessing (`ocrPreprocess.ts`) hard-binarised every image unconditionally, which could wipe an overexposed slip to blank — now runs the existing (previously unwired) `enhanceIfNeeded` adaptive brightness/contrast correction first; `qrRecovery.ts` (GS-026) and `ocrFallback.ts` (GS-012) were built and tested but never called from production — wired into `extractSlipCandidate`; a shared `engine/image/canvas.ts` was extracted (three independent copies of the OffscreenCanvas/DOM-canvas fallback and the luma formula had drifted); several `slipParser.ts` edge cases (unanchored date regex fabricating a year from digits inside an account/reference number, an overly strict account-line pattern, a payee's own bank-name line being captured as their name). 2038 tests.
>
> **Code-review pass 2** (`ec75eff`) — a second 5-agent review specifically of pass 1's diff, catching regressions pass 1 introduced: OCR-derived date/time were discarded when OCR ran only to resolve the bank (a CRC-valid EMVCo QR carries no date, so the transaction silently got today's date instead); the newly-wired QR recovery had no `try`/`catch`, so a canvas-transform failure could abort a whole gallery batch; `recoverQr` redundantly re-decoded the original bytes with the same decoder `detect()` had just tried (added a `skipOriginal` option); `imageEnhancer.ts` still hand-rolled `OffscreenCanvas` directly instead of the shared `canvas.ts` helper pass 1 added — so adaptive enhancement silently no-opped on exactly the WebViews that helper exists for; the broadened `ACCOUNT_LINE` label prefix could match an unrelated labelled digit line (e.g. a phone number) and mis-anchor the positional recipient scan — restricted to an account-label allowlist; `META_LINE`'s amount words (`ยอด`/`รวม`) could false-positive-skip a real name containing them — now require a trailing digit; the recipient label list was re-copied by hand instead of derived from the shared registry. 2039 tests.
>
> **Current status**: `tsc -b`, `oxlint`, the full test suite (2039 tests), and `npm run build` are all clean; the latest APK (post-`ec75eff`) is installed on-device. **Known remaining gap**: category learning is wired read-side only — nothing in the UI yet calls `categoryLearningStore.learn()` (no category field/picker exists in `ImportPreview`), so a user has no way to correct a guessed category and have it stick. Not fixed here since it requires new UI, not a bug fix — tracked in [TECHNICAL_DEBT.md](../docs/TECHNICAL_DEBT.md).

## Slip Intelligence — Phases 1-9 (2026-08-15)

Not new MASTER_TASK/GS ids — a follow-up architecture review (documented separately, not a code artifact) found several fully-tested engines with zero production call sites and two never-integrated scan pipelines, and recommended a phased close-out. Recorded here in the same "real work found and fixed post-epic" style as the Post-Launch Stabilization section above, since GS/PLT themselves are unchanged (still 50/50 + 20/20).

> **Phase 1 — wire real extraction into the orchestrator** (`79e9c24`) — `slipExtractionProcessor.ts` (new) wraps `extractSlipCandidate` as a `ScanProcessor`, so `createScanSession` (previously always defaulting to a no-op `recordingProcessor`) can drive real extraction; proven end-to-end by a new integration test (`orchestratedExtraction.integration.test.ts`). Found and fixed a genuine concurrency bug while writing it: `scanSessionService`'s within-run content-hash dedup used a `Set<string>`, so a *retry* of a failed asset (same content, same assetId) was indistinguishable from a duplicate of itself and got silently skipped instead of retried — changed to a `Map<contentHash, reservingAssetId>`.
>
> **Phase 2 — wire the orphaned engines into production** (`d82c19c`) — `slipCandidate.ts`'s confidence score now calls the real Confidence Engine (`combineConfidence`, GS-046) instead of the placeholder `basicConfidence` heuristic; `useSlipScan` layers the graded Smart Duplicate Engine (GS-031, pHash-based) on top of its existing exact-match dedup; `smartImport.ts` runs the Import Conflict Resolver (GS-032) against existing transactions before creating each one, via a new `referenceFromNote()` heuristic (since `Transaction` has no structured reference field, but `candidateToTransaction` always writes `"bank · reference"` into `note`); `useSmartImport` now calls `importHistoryRepository.add()` after every batch (GS-035's repository existed but nothing wrote to it); a new `ScanRecoveryNotice`, mounted in `MainLayout`, calls the Recovery System (GS-037)'s `detectRecovery`/`planRecovery` on app start and surfaces a resumable-scan / failed-import toast.
>
> **Phase 3 — confidence-tier import policy** (`a90879f`) — a new `confidenceTier.ts`: `high`/`medium`/`low`/`critical` (the last overriding all others on a missing or non-positive amount), with `isAutoImportEligible()` requiring `high` + non-duplicate. `useImportPreview`'s default selection switched from "every non-duplicate" to this policy; `ImportPreview.tsx` shows a colored tier badge instead of a bare confidence percentage.
>
> **Phase 4 — bump cache engine versions** (`4e5e55f`) — `scanCachePolicy.ts`'s `CURRENT_ENGINE_VERSIONS` moved off the placeholder `{ocr:"0", payload:"0", parser:"0"}` to real values, with a comment documenting when each should be bumped going forward (an extraction-affecting change to that engine → bump its version → previously-cached entries are treated as stale and re-scanned).
>
> **Phase 5 — checkpoint-write throttling** (`1396206`) — a new `checkpointThrottle.ts` (flush at most every 2s or every 50 items, whichever first, always flushing on the very first call) gates `scanSessionService`'s progress-checkpoint Dexie writes, which previously fired on every single settled item — at 50k images that was 50k writes for one run. `pause()` also forces an immediate flush (a natural "user stepped away" moment), and an unconditional final flush guarantees the persisted counts are exact once a run ends regardless of where the throttle's own schedule landed.
>
> **Phase 6 — Review Queue category correction + Import History screen** (`b08dab8`, `b454751`) — `SlipCandidate.category` (new, optional) is a Review Queue override that `candidateToTransaction` trusts ahead of the auto-`categorize()` guess; a new `ReviewEditForm` component (amount/merchant/category, wired into `ImportPreview` via a per-row edit button) lets a person correct a candidate before import, and saving a category that matches one of the fixed keyword-based `SlipCategory` values now calls `categoryLearningStore.learn()` — the exact write-side gap the Post-Launch Stabilization section above flagged as open. Separately, a new `ImportHistoryDrawer` + `useImportHistory` hook, surfaced from a new Settings > Data Management tile, gives `filterImportHistory()`/`importHistoryRepository` (GS-035, written-to since Phase 2 but never read back) their first UI.
>
> **Phase 7 — orchestrator-driven scan UI** (`6393b5e`) — `useScanStore`/`useGalleryScan` gained an optional `processor` parameter (previously hardcoded to the no-op recorder); a new `useFullGalleryScan` hook composes it with `createSlipExtractionProcessor` and turns the orchestrator's raw `done`/`skipped`/`failed` counters into the richer `ScanProgressSnapshot` the already-built-but-never-mounted `ScanProgressDashboard` (GS-034) expects, adding `qrDetected`/`ocrProcessed` accumulated from each arriving candidate. A new `FullGalleryScanPanel` component wraps it with working Pause/Resume/Cancel controls. Deliberately **not** wired into live navigation: on native, `NativeMediaProvider` was still a stub at this point (Phase 8), and the concurrent queue's processing order isn't compatible with `useSlipScan`'s same-batch duplicate detection, so the existing picker flow was left untouched. Caught a real bug while writing its test: `useScanStore` is a module-level singleton, so a freshly mounted panel could inherit an already-`"completed"` status left over from a previous scan and fire its `onComplete` callback with zero candidates immediately on mount, before ever actually scanning — fixed by tracking status *transitions* (`prev !== "completed" && current === "completed"`) instead of the current value alone.
>
> **Phase 8 — native MediaStore plugin** (`d6ba252`) — `GalleryMediaPlugin.java` (new), registered under the Capacitor plugin name `"GalleryPermissions"` that `galleryPermissionPlugin.ts` had declared since GS-005 with no native implementation behind it — so that existing permission contract now works for real with zero JS changes, and the same class additionally exposes `count`/`page`/`readBytes` for `NativeMediaProvider.ts` (previously a zero-assets stub) to call. Permission-state computation reuses Capacitor's own `getPermissionState(alias)` (already correctly handling the granted/denied/prompt/prompt-with-rationale distinction) for the granted/denied axis, combined with custom logic for Android 14+'s `READ_MEDIA_VISUAL_USER_SELECTED` "limited" partial-access grant. Pagination and the incremental cursor are keyed on MediaStore's `DATE_ADDED` rather than `DATE_TAKEN` (frequently 0 for screenshots/downloads, and can predate when a file actually entered the gallery) — a deliberate choice, not a shortcut: "have I scanned everything that was here as of my last run" is a question about insertion time. Written in Java, not Kotlin, matching the existing all-Java Android project rather than introducing a Kotlin toolchain for one plugin. **Validated**: compiles against the real Capacitor 8.4.2 Java sources (`:app:compileDebugJavaWithJavac`) and a full `:app:assembleDebug` packages successfully with the synced web build. **Not validated on-device** — no device was connected during this work; left unwired from navigation for that reason (see Phase 7).
>
> **Phase 9 — hardening** (`d092800`) — two new stress tests in `scanSession.stress.test.ts`: one proves `ByteBudget` is a real, independent memory limiter (not just the concurrency setting) by pushing concurrency past what a realistic 4MB image size lets the default 32MB budget support; another runs a 10,000-image library end-to-end and confirms checkpoint-write throttling (Phase 5) holds at that scale (far fewer than one Dexie write per image). A new `emvcoPayloadParser.fuzz.test.ts` drives ~8,000 arbitrary and TLV-shaped-but-corrupted strings (via a small seeded PRNG, so a failure is reproducible rather than flaky) through `parseTlv`/`parseEmvcoPayload`/`extractOcrSlipFields` — the parsers that run on untrusted, error-prone input straight from image decoding — asserting none of them ever throw. E2E tests were considered and deliberately not added: a real QR-decode E2E test needs a QR-*encoding* library to generate a scannable fixture image (only the decoder, `jsqr`, is a dependency), and a shallower test not exercising real decoding would just duplicate existing component-level coverage.
>
> **Current status**: `tsc -b`, `oxlint`, and the full slipScanner test suite (388 tests) are clean; `npm run build` and `:app:assembleDebug` both succeed. **Known remaining gaps** (see [TECHNICAL_DEBT.md](../docs/TECHNICAL_DEBT.md)): the native plugin needs on-device validation; `FullGalleryScanPanel` has no nav entry point; the orchestrator scan path doesn't flag same-batch near-duplicates (cross-batch protection against the existing ledger is unaffected).
