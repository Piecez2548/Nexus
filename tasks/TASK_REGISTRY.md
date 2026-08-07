# Task Registry

Master registry of all planned and completed Nexus tasks, grouped by Epic. See [README.md](README.md) for conventions and lifecycle.

**Last Updated:** 2026-08-08

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
| Gallery Scanner (GS) | 50 | 8 | 42 | 0 | 0 |
| Platform (PLT) | 20 | 0 | 20 | 0 | 0 |
| **Total** | **108** | **35** | **73** | **0** | **0** |

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
| GS-009 | Gallery Scanner | QR Detector | Critical | Todo | GS-007 |
| GS-010 | Gallery Scanner | EMVCo Payload Parser | Critical | Todo | GS-009 |
| GS-011 | Gallery Scanner | Bank Identification | High | Todo | GS-010 |
| GS-012 | Gallery Scanner | OCR Fallback | High | Todo | GS-009 |
| GS-013 | Gallery Scanner | Duplicate Detection | High | Todo | GS-010 |
| GS-014 | Gallery Scanner | Bank Selection Popup | Medium | Todo | GS-011 |
| GS-015 | Gallery Scanner | Import Preview | High | Todo | GS-013 |
| GS-016 | Gallery Scanner | Smart Import | High | Todo | GS-015 |
| GS-017 | Gallery Scanner | Security | High | Todo | GS-008 |
| GS-018 | Gallery Scanner | Performance Optimization | Medium | Todo | GS-007 |
| GS-019 | Gallery Scanner | AI Validation | Medium | Todo | GS-016 |
| GS-020 | Gallery Scanner | Scanner Analytics | Low | Todo | GS-016 |
| GS-021 | Gallery Scanner | Testing | High | Todo | GS-016 |
| GS-022 | Gallery Scanner | Final Review | Medium | Todo | GS-021 |
| GS-023 | Gallery Scanner | Smart Scan Scheduler | Medium | Todo | GS-006 |
| GS-024 | Gallery Scanner | Image Hash Engine | High | Todo | GS-008 |
| GS-025 | Gallery Scanner | Slip Validation Engine | High | Todo | GS-010 |
| GS-026 | Gallery Scanner | QR Recovery Engine | Medium | Todo | GS-009 |
| GS-027 | Gallery Scanner | Image Enhancement | Medium | Todo | GS-012 |
| GS-028 | Gallery Scanner | OCR Text Engine | High | Todo | GS-012 |
| GS-029 | Gallery Scanner | Slip Classifier | Medium | Todo | GS-010 |
| GS-030 | Gallery Scanner | Bank Template Engine | Medium | Todo | GS-011 |
| GS-031 | Gallery Scanner | Smart Duplicate Engine | Medium | Todo | GS-013 |
| GS-032 | Gallery Scanner | Import Conflict Resolver | Medium | Todo | GS-016 |
| GS-033 | Gallery Scanner | Background Worker | High | Todo | GS-007 |
| GS-034 | Gallery Scanner | Scan Progress Dashboard | Medium | Todo | GS-006 |
| GS-035 | Gallery Scanner | Import History | Medium | Todo | GS-016 |
| GS-036 | Gallery Scanner | Performance Monitor | Low | Todo | GS-018 |
| GS-037 | Gallery Scanner | Recovery System | Medium | Todo | GS-033 |
| GS-038 | Gallery Scanner | Security Audit | Medium | Todo | GS-017 |
| GS-039 | Gallery Scanner | Developer Tools | Low | Todo | GS-021 |
| GS-040 | Gallery Scanner | Production Readiness | Medium | Todo | GS-022 |
| GS-041 | Gallery Scanner | AI Slip Verification | Medium | Todo | GS-019 |
| GS-042 | Gallery Scanner | Fraud Detection Engine | Medium | Todo | GS-041 |
| GS-043 | Gallery Scanner | AI Transaction Categorization | Medium | Todo | GS-016 |
| GS-044 | Gallery Scanner | Merchant Intelligence | Medium | Todo | GS-043 |
| GS-045 | Gallery Scanner | Smart Learning Engine | Low | Todo | GS-043 |
| GS-046 | Gallery Scanner | Confidence Engine | Medium | Todo | GS-025 |
| GS-047 | Gallery Scanner | Transaction Linking | Low | Todo | GS-016 |
| GS-048 | Gallery Scanner | Spending Intelligence | Low | Todo | GS-043 |
| GS-049 | Gallery Scanner | AI Quality Review | Low | Todo | GS-019 |
| GS-050 | Gallery Scanner | Financial Intelligence Report | Low | Todo | GS-048 |

> GS-005 (Gallery Permission Manager) implemented as the permission foundation: a unified status model (granted/limited/prompt/denied/blocked/unavailable) spanning Android 13/14/15 + web, a native plugin contract (`registerPlugin`) that degrades gracefully until the on-device media plugin is wired, `useGalleryPermission` (denial + Settings-recovery flow), and the `READ_MEDIA_IMAGES`/`READ_MEDIA_VISUAL_USER_SELECTED` manifest permissions. Validated build/tsc/lint/test; native behaviour to be verified on-device.
>
> GS-006 (Gallery Scanner) implemented via the adapter architecture: a plugin-agnostic `MediaProvider` interface + `WebPickerProvider` (web) + `NativeMediaProvider` stub (native, wired later); `scanSessionService` orchestrates scan-all, incremental skip (by assetId), duplicate prevention (SHA-256 content hash), progress reporting, pause/resume/cancel, cooperative backgrounding, and session persistence/resume (Dexie v15 `slipScanRuns`/`slipScannedAssets`, device-local, unsynced) — with a `ScanProcessor` seam for the future extraction pipeline. `scanStore` + `useGalleryScan` drive it; the scanner imports no Capacitor/plugin. Validated build/tsc/lint (10 tests); native enumeration to be verified on-device.
>
> GS-007 (Scan Queue) added the concurrent worker pool under the orchestration: `runConcurrentQueue` (N self-balancing workers pulling lazily from the provider stream — the source is the backpressure, nothing is buffered), bounded retries with linear backoff, and a `ByteBudget` semaphore that caps total in-flight image bytes (memory protection + dynamic batching by image size). `scanSessionService` now runs through the queue with a synchronous within-run content-dedup Set (race-free under concurrency, alongside the cross-run DB check); concurrency is device-derived (`resolveConcurrency`) and overridable via `ScanOptions`. Cursor advances only on a clean finish; interruption resumes via assetId dedup. Full suite green (1716 tests).
>
> GS-008 (Scan Cache) upgraded the GS-006 store into a versioned production cache (Dexie v16 `slipScanCache`, replacing `slipScannedAssets`) behind a `ScanCache` interface — so the orchestration and queue stay independent of the cache implementation (`dexieScanCache`, injectable/fakeable). Entries carry lastModified + status + OCR/payload/parser versions + failure count. Behaviour: skip-unchanged (cache hit), re-scan changed (lastModified) and stale (version bump — the `hasContent` check excludes an asset's own entry so identical content still re-scans), remembered failures retried across runs up to a policy limit then skipped, plus `invalidate`/`clear`. Engine versions are placeholder `0` until extraction (GS-009+) defines real ones. Full suite green (1724 tests).

---

## Platform (PLT)

Cross-cutting platform frameworks from `MASTER_TASK.md` — plugin SDK, event bus, background task engine, import/export frameworks, search/filter/table/dashboard, AI gateway, command palette, telemetry. Not started.

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| PLT-001 | Platform | Plugin SDK (design) | Medium | Todo | — |
| PLT-002 | Platform | Event Bus | High | Todo | — |
| PLT-003 | Platform | Background Task Engine | High | Todo | PLT-002 |
| PLT-004 | Platform | File Import Framework | Medium | Todo | PLT-001 |
| PLT-005 | Platform | Export Framework | Medium | Todo | PLT-001 |
| PLT-006 | Platform | Notification Center | Medium | Todo | PLT-002 |
| PLT-007 | Platform | Audit Log | Medium | Todo | — |
| PLT-008 | Platform | Feature Flags | Low | Todo | — |
| PLT-009 | Platform | Settings Framework | Medium | Todo | — |
| PLT-010 | Platform | Configuration Manager | Medium | Todo | PLT-009 |
| PLT-011 | Platform | Global Search | Medium | Todo | — |
| PLT-012 | Platform | Filter Engine | Medium | Todo | — |
| PLT-013 | Platform | Table Engine | Medium | Todo | PLT-012 |
| PLT-014 | Platform | Dashboard Framework | Medium | Todo | PLT-015 |
| PLT-015 | Platform | Widget SDK | Medium | Todo | PLT-001 |
| PLT-016 | Platform | Local AI Gateway | High | Todo | — |
| PLT-017 | Platform | AI Memory | Medium | Todo | PLT-016 |
| PLT-018 | Platform | Command Palette | Medium | Todo | PLT-011 |
| PLT-019 | Platform | Local Telemetry | Low | Todo | — |
| PLT-020 | Platform | Platform Certification | Medium | Todo | — |
