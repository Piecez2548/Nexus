# Changelog

**Last Updated:** 2026-08-15

## Overview

This changelog is reconstructed directly from `git log` (72 commits, `26abcb9` → `HEAD`), grouped into milestones rather than listed commit-by-commit. `package.json` still declares `"version": "0.0.0"` — **no semantic versioning scheme is in use yet**; this document uses the term "version" loosely to mean development milestones.

## Current Version

`0.0.0` (package.json) — pre-release, actively developed, not yet tagged or published.

## Timeline

The full commit history spans **2026-07-25 to 2026-08-07**, with the AI Analytics module and several other major features landing on 2026-08-01 alone.

## Major Milestones

### Foundation (2026-07-25)
- Initial commit (`26abcb9`).
- Cloud sync sign-in requirement added when Supabase is configured (`aa266c1`).
- Early mobile-layout and cross-device sync data-mismatch fixes.

### Encryption-at-rest, staged rollout (2026-07-25, `6220551` → `c0688cd`)
Shipped as 8 explicitly-staged commits: crypto primitives + session key + repository plumbing (Stages 0-3) → Enable Encryption migration (Stage 4) → Forgot PIN recovery flow (Stage 5) → Settings UI (Stage 6) → backup service compatibility (Stage 7) → sync engine opaque-blob regression test (Stage 8) → server-side `user_encryption_keys` table + RLS. See [SECURITY.md](SECURITY.md) for the full design this shipped.

### Sync engine hardening (multiple dates)
A cluster of fixes addressing real cross-device race conditions as they were found: resurrected-deleted-rows on refresh, duplicate-`syncId` Postgres errors (two separate root causes, fixed in two separate commits), edits/deletes silently reverting when two devices synced near each other, and a speed-up from a 30s to a 5s sync interval (later re-confirmed/re-enabled after a regression).

### Life Modules (2026-07-26 onward)
- Habit Tracker — v1.0 scope, first Life Module (`0835933`, 2026-07-26).
- Portfolio — v1.0 scope, second Life Module (`28ba7eb`).
- Calendar — v1.0 scope, third Life Module (`79e9018`), later **replaced** by Life Schedule (see below) — this is why `src/features/calendar/` survives today only as an orphaned type declaration (see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).

### App Lock & biometrics
- Fingerprint unlock added as a supplementary alternative to the PIN.
- A device-crash fix for weak-class biometry (`isBiometricAvailable()` now checks `strongBiometryIsAvailable` specifically).
- A `patch-package` patch applied to `@capgo/capacitor-native-biometric` to fix a crash on every device — still applied on every `npm install` via `postinstall`.

### UX and platform polish
- A 4th "Mono" theme added, Login screen redesigned (twice — once for a "more premium look").
- Sentry error monitoring added (optional, `VITE_SENTRY_DSN`-gated).
- `TransactionDrawer`/`TradeDrawer` lazy-loaded, cutting the main bundle ~15%.
- PWA service worker registration skipped inside the Capacitor native WebView specifically to avoid serving a stale bundle after an APK update.
- Merge Duplicate Transactions added to Settings; Settings reorganized into clear groups with "Reset All Data" isolated in its own danger zone.

### Life Schedule replaces Calendar, Reminders subsystem added (2026-08-01, `5e38594`)
Calendar's dated-event UI was retired in favor of a recurring daily-routine timeline (Life Schedule), and a shared native-notification `reminders/` module was added, consumed by both Habits and Schedule. Same commit made form validation messages translatable and fixed local-date handling app-wide.

### Dashboard refactor + Goal Milestone Events (2026-08-01, `cc9ca4d`)
Dashboard rebuilt around real per-module preview panels (Budget, Habit, Portfolio, Schedule, Todo, Trading); Goal Milestone Events (25/50/75/100% crossing log) added to the finance module.

### AI Analytics — the largest single feature (2026-08-01, `5a9b896`)
One commit introducing the entire local, rule-based AI Analytics engine: Financial Health Score, Rule Engine (~46 rules), Recommendation Engine, Behavior Analysis Engine, Forecast & Trend Engine (with an interactive What-If simulator), Executive Summary Generator, AI Coach (16-intent Q&A), and the AI Gateway (`src/ai/`) — a designed-but-intentionally-unwired seam for a future real LLM provider. See [AI_ANALYTICS.md](AI_ANALYTICS.md) for the full architecture and the Sprint 1 status audit (P001–P011, all 11 pieces completed except the Gateway's integration).

### AI Analytics UI completion + consolidation (2026-08-01 → 2026-08-02)
- Forecast, What-If, and Executive Summary UI panels built to surface engine data that initially had no UI (`e58995f`).
- Duplicated math consolidated (clamp, coefficient-of-variation, percent-change helpers), dead code removed, health-score UI reconciled onto a single card (`3ad5f34`).
- Hardcoded-language strings fixed across notifications, insights, and encryption flows (`eab941f`).
- Global Search expanded to every entity type, and the resulting `TopBar` re-render regression fixed with narrow selectors + `memo()` (`9c8bc3c`).
- Recommendations section consolidated onto the richer `ActionableRecommendation` model (`55bc651`).
- Repository/service CRUD factories extracted, dead `ComingSoon` page removed (`4a84fd1`).
- Sync engine merge safety hardened: malformed-row guard + last-write-wins (`3909f1b`).
- Small info tooltips added to Dashboard cards/charts, translation strings updated (`47455b2`, `4e9adb7`).

### Documentation, task system, and AI Analytics quality passes (2026-08-07)
The `/docs` documentation set and a file-based `tasks/` registry (previously untracked working-tree artifacts) were committed, followed by four scoped AI Analytics passes — each output-preserving, with no change to financial calculations:
- **A11Y-001** — screen-reader and keyboard accessibility for the AI Analytics charts: a shared `ChartFigure` (`role="img"` + a data-driven `aria-label`) wraps every Recharts chart and the CSS-grid heatmap/calendar, the decorative merchant sparkline is hidden from assistive tech, and the recommendation disclosure gained `aria-expanded`/`aria-controls`. No visual change (`4134a56`).
- **PERF-001** — `monthlyValuesFor` rewritten as a single pass over transactions (O(months×N) → O(N)) with byte-identical output (`088f3ac`).
- **PERF-002** — a lean `computeHealthScoreSummary` lets score-trend points skip the explanation aggregation they discard; the full health score is unchanged (`ebc9f85`).
- **UX-001** — the AI Analytics error retry re-runs the analysis in place via a new `useFinancialAnalysis().retry()` instead of `window.location.reload()`, leaving all state outside the module untouched (`754a98f`).
- **UX-002** — hardened that retry: a synchronous engine throw now surfaces as an error state (the `analyze()` call is routed through `Promise.resolve().then(...)`) instead of hanging on `loading`, and retry re-fetches the finance stores before re-analysing (`86df606`).
- **A11Y-002** — a second accessibility pass: a global keyboard `:focus-visible` ring (`index.css`), a shared visually-hidden `ChartDataTable` exposing the key charts' numbers (score radars, health trend, monthly cash flow) to screen readers, a no-behaviour-flags empty state, and an `overflow-x-auto` wrapper on the desktop merchant table (`34acf5b`).

### Gallery Slip Scanner — foundation (2026-08-07 → 2026-08-08, `GS` epic, in progress)
A new, fully plugin-agnostic Gallery Slip Scanner is being built out under its own `GS` epic (the `MASTER_TASK.md` program, renumbered to avoid colliding with the existing `OCR-001…007`). Local commits, **not yet released**:
- **GS-005** — gallery permission manager spanning Android 13/14/15 + web, behind a `registerPlugin` native contract that degrades gracefully until an on-device media plugin is wired; `READ_MEDIA_IMAGES`/`READ_MEDIA_VISUAL_USER_SELECTED` manifest permissions (`3a3ba6e`).
- **GS-006** — plugin-agnostic scan orchestration: a `MediaProvider` interface with a web file-picker provider + a native stub, driving scan-all, incremental skip, duplicate prevention, progress, pause/resume/cancel, cooperative backgrounding, and resumable session persistence (Dexie v15) (`286adbf`).
- **GS-007** — concurrent scan queue: N self-balancing workers pulling lazily from the provider (the source is the backpressure), bounded retries with backoff, and a `ByteBudget` semaphore capping in-flight image bytes (memory protection + dynamic batching) (`c9b35e1`).
- **GS-008** — production scan cache (Dexie v16 `slipScanCache`) behind an injectable `ScanCache` interface: versioned entries (OCR/payload/parser) for staleness, skip-unchanged / re-scan-changed / re-scan-stale, a remembered-failure cross-run retry policy, and invalidation.

The extraction pipeline and its supporting layers then landed (2026-08-08, GS-009 → GS-022), each behind swappable interfaces so nothing is coupled to a plugin or a backend, and each validated (tsc/lint/build + a growing test suite, 159 slipScanner tests by GS-021):
- **GS-009 → GS-013** — the extraction engine: a plugin-agnostic QR detector (jsQR isolated behind a `QrDecoder` seam), an EMVCo/PromptPay TLV payload parser with CRC-16 integrity, plugin-based bank identification keyed on the real Bank of Thailand codes, an OCR fallback that *reuses the existing Tesseract engine* and runs only when the QR is missing/damaged, and slip-level duplicate detection (same transaction across different images).
- **GS-014, GS-015, GS-016** — the import flow: a pre-scan bank-selection popup (remembered selection, search, estimates), the unified `SlipCandidate` model + Import Preview (thumbnail/bank/amount/date/time/merchant/duplicate/confidence, filter/search/select), and Smart Import (batch with per-item progress, error recovery, cancel/resume, and rollback), reusing the existing `transactionService` — no new data path.
- **GS-017 → GS-020** — cross-cutting: scanner security (permission/import audit log, secure deletion of thumbnails/decoded bytes, CRC-based tamper detection), performance metrics, deterministic (never-mutating) AI validation, and cross-run analytics.
- **GS-021, GS-022** — critical-path integration + stress/memory tests, and this module-wide review checkpoint.

**Live wiring (2026-08-08)** — the scanner is now user-facing on web: a **"Scan Gallery"** button on the Transactions page (`GalleryScanFlow`) drives the full flow — bank selection → image picker → real jsQR + Tesseract extraction (`extractSlipCandidate` + `useSlipScan`) → Import Preview → Smart Import into transactions. The native gallery path uses `@capacitor/camera`'s `pickImages` (guarded, dynamically imported), wired but pending `npx cap sync android` + an on-device test. Full-gallery *auto*-enumeration (the `NativeMediaProvider` / MediaStore path) remains a stub — today's shipping path is the picker, not whole-library auto-scan. See [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md)'s GS epic.

**Refinement engines (2026-08-08, GS-023 → GS-040)** — a second wave of scanner engines, each behind swappable interfaces / pure logic and validated per task: a battery/charging-aware **smart scan scheduler** (GS-023), an **image hash engine** (SHA-256 + DCT perceptual hash, GS-024), a **slip validation engine** with per-field validity + confidence (GS-025), a **QR recovery engine** that retries over rotate/brighten/contrast/upscale variants (GS-026), **image enhancement** that preprocesses only when needed (GS-027), a per-field **OCR text engine** with confidence (GS-028), a **slip classifier** (GS-029), a plugin-based **bank template engine** (GS-030), a graded-probability **smart duplicate engine** (GS-031), an **import conflict resolver** (replace/skip/merge/keep-both, GS-032), a general **background worker** (GS-033), a **scan-progress dashboard** (GS-034), **import history** (Dexie v17, GS-035), a **performance monitor** (GS-036), a crash/interruption **recovery system** (GS-037), a **security audit** layer (GS-038), and dev-gated **developer tools** (GS-039) — reviewed at the **GS-040** production-readiness checkpoint.

**AI/intelligence layers (2026-08-08, GS-041 → GS-050) — completes the GS epic (50/50).** All deterministic, local, and advisory (never mutating imported data): AI slip verification (QR↔OCR consistency → authenticity/confidence/risk), fraud detection (Low/Medium/High + reasons), transaction categorization with local learning, merchant intelligence (alias/chain merge + frequency), a smart learning engine (merchant/OCR/bank corrections), a confidence engine (combines QR/OCR/parser/bank/AI), transaction linking (refund/fee/installment/split/cashback), spending intelligence (top category / trend / abnormal expense), AI quality review, and a financial intelligence report (JSON/CSV; PDF via the existing jspdf infra). ~297 slipScanner tests.

**Platform epic (2026-08-08, PLT-001 → PLT-020).** Per the reuse rule, only the genuinely-new frameworks were implemented under `src/platform/` — Event Bus, Feature Flags, Command Palette (global Ctrl+K, mounted in `MainLayout`), and Local Telemetry (never sends data online) — with 21 tests; the remaining PLT items are satisfied by existing app/GS systems (Global Search, AI Gateway, import/export, notifications, settings, audit, AI memory, background worker) or specified design-only (Plugin SDK), documented in [../tasks/Platform/PLATFORM_DESIGN.md](../tasks/Platform/PLATFORM_DESIGN.md). Certified at PLT-020. Remaining forward work: full-gallery native auto-enumeration and on-device verification of the native picker.

### Gallery Slip Scanner — post-launch stabilization (2026-08-08 → 2026-08-11)
With the GS (50/50) and PLT (20/20) epics complete, the native picker was verified on a real device and the scanner was run against real Thai bank slips, surfacing bugs that landed as they were found, then two code-review passes over the whole pipeline:
- **On-device bug-fix round** (`a71d6cb`, `343f162`, `9d95994`, `7b9013f`, `ee45134`, `1e59da6`, `dfcc096`) — a QR-decode canvas fallback for Android WebViews without `OffscreenCanvas`; an amount-extraction bug picking the wrong number off a slip ("20 → 520"), fixed by anchoring to a currency marker/label; "Unknown bank" on real slips (completed Thai slips carry a slip-*verification* QR, not an EMVCo payment QR — added OCR-text bank identification, earliest-keyword-wins); imported-row quality (title/category/grammar); full-resolution gallery image picking for OCR; and merchant extraction extended from shop-keyword matching to positional extraction, so label-less e-wallet/person payees (e.g. a PromptPay/G-Wallet top-up) resolve correctly instead of falling back to the bank name.
- **Code-review pass 1** (`dbe4ca2`) — a 10-agent parallel review found and fixed: `identifyBank()` could never match a real (non-PromptPay) bank from EMVCo (no GUIDs were ever populated) — now falls back to OCR text when EMVCo leaves the bank unresolved; the category-learning store was fully disconnected from import — wired (read side), with the guessed category now validated against the user's live category list; a `??`/`||` inconsistency broke category fallback on an empty merchant; OCR preprocessing hard-binarised every image unconditionally (could wipe an overexposed slip to blank) — now runs adaptive brightness/contrast correction first; the QR recovery engine (GS-026) and OCR fallback (GS-012) were built and tested but never called from production — wired in; a shared `engine/image/canvas.ts` replaced three drifted copies of the same canvas-fallback/luma code; several `slipParser.ts` edge cases (a date regex that could fabricate a year from an account number, an overly strict account-line pattern, a payee's bank-name line captured as their name).
- **Code-review pass 2** (`ec75eff`) — a second review of pass 1's own diff caught regressions it introduced: OCR-derived date/time discarded when OCR ran only to resolve the bank; the newly-wired QR recovery had no error handling, so a canvas failure could abort a whole gallery batch; a redundant re-decode in QR recovery; `imageEnhancer.ts` not yet using the shared canvas helper (so adaptive enhancement silently no-opped on exactly the WebViews it exists for); an account-line pattern broad enough to match an unrelated phone number; a `META_LINE` word that could false-skip a real name.

Full test suite: 159 slipScanner tests at the GS-022 checkpoint → ~297 at GS-050 → 2039 project-wide today. See [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md)'s "Gallery Scanner — Post-Launch Stabilization" section for the detailed per-round notes.

### Slip Intelligence — closing the "built, tested, never wired" gaps + native full-gallery plugin (2026-08-15, 10 commits, `79e9c24` → `d092800`)
A System-Architecture-Review-style audit of the scanner found a consistent pattern across half a dozen modules: real, fully-tested engines (`combineConfidence`, `smartDuplicate`, `conflictResolver`, `recoverySystem`, `importHistoryRepository`, `hashImage`/pHash) with zero production call sites, plus two entirely separate, never-integrated scan pipelines — the live picker flow (`useSlipScan`, sequential) and a concurrent, byte-budgeted, resumable orchestrator (`scanSessionService` + `runConcurrentQueue` + `ByteBudget` + `dexieScanCache`, GS-006/007/008) that only ever ran a no-op processor. Nine phases closed these gaps:
- **Phase 1** (`79e9c24`) — `slipExtractionProcessor.ts` wraps `extractSlipCandidate` as a real `ScanProcessor`, proven end-to-end against the orchestrator by a new integration test; fixed a genuine concurrency bug found while writing it (`scanSessionService`'s content-hash dedup could mistake a retry of a failed asset for a duplicate of itself).
- **Phase 2** (`d82c19c`) — wired the orphaned engines into production: `slipCandidate.ts`'s confidence score now calls the real Confidence Engine (previously a transparent `basicConfidence` heuristic); `useSlipScan` layers the graded Smart Duplicate signal (pHash-based) on top of exact-match dedup; `smartImport.ts` runs `resolveConflict` against existing transactions before importing (via a new `referenceFromNote()` heuristic, since `Transaction` has no structured reference field); `useSmartImport` now writes to `importHistoryRepository` (previously never called in production); a `ScanRecoveryNotice` surfaces `recoverySystem`'s resumable-scan / failed-import detection on app start.
- **Phase 3** (`a90879f`) — a confidence-tier policy (`high`/`medium`/`low`/`critical`, the last overriding on a missing/non-positive amount) drives Import Preview's default selection (previously "everything non-duplicate") and a colored tier badge.
- **Phase 4** (`4e5e55f`) — bumped the scan-cache engine versions from placeholder `"0"` to real values, with a comment documenting when to bump each going forward.
- **Phase 5** (`1396206`) — checkpoint writes during a scan are now throttled (every 2s or 50 items) instead of one Dexie write per image, verified at 10k images (see the Phase 9 stress test below).
- **Phase 6** (`b08dab8`, `b454751`) — closed the category-learning UI gap: `SlipCandidate.category` is a Review Queue override field, a new `ReviewEditForm` lets a person correct amount/merchant/category per candidate in Import Preview, and saving a category that matches one of the fixed keyword-based categories now actually calls `categoryLearningStore.learn()` (previously only its own test did). Also shipped Import History as a real Settings screen (search + status filter over the log Phase 2 started writing).
- **Phase 7** (`6393b5e`) — threaded a real `ScanProcessor` through `useScanStore`/`useGalleryScan` (previously hardcoded to a no-op) and added `useFullGalleryScan` + `FullGalleryScanPanel`: the concurrent orchestrator driving real extraction with a live `ScanProgressDashboard` (percent/ETA/qrDetected/ocrProcessed) and working pause/resume/cancel — built and tested, but deliberately left with no live nav entry point pending Phase 8. Caught and fixed a real bug while testing it: `useScanStore` is a module-level singleton, so a freshly mounted panel could inherit an already-"completed" status left over from a previous scan and fire its completion callback with zero candidates before ever scanning; fixed by tracking status *transitions* instead of the current value.
- **Phase 8** (`d6ba252`) — implemented `GalleryMediaPlugin.java`, a real native Android plugin (Java, matching the project's existing all-Java Android code rather than introducing a Kotlin toolchain) backing both the gallery-permission contract declared since GS-005 and new MediaStore `count`/`page`/`readBytes` methods that `NativeMediaProvider.ts` (previously a zero-assets stub) now calls for real. Pagination and the incremental cursor are keyed on `DATE_ADDED` rather than `DATE_TAKEN` (frequently null for screenshots/downloads) — insertion time, not capture time, is what "have I already scanned this" actually needs. Compiles against the real Capacitor 8.4.2 Java sources and packages into a working debug APK; **not yet validated on a physical device** (none was connected this session) — left unwired from live navigation for that reason.
- **Phase 9** (`d092800`) — hardening: a stress test proves `ByteBudget` is a real, independent memory limiter (not just the concurrency setting) at a realistic 4MB image size, and a 10k-image run confirms checkpoint throttling holds at scale; a seeded-PRNG fuzz test drives ~8,000 malformed/TLV-shaped-but-corrupted strings through the EMVCo payload parser and OCR field extractor (the two parsers that run on untrusted image-decode output) with zero crashes.

See [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) for what these phases left open (native plugin device validation, `FullGalleryScanPanel`'s missing nav entry point, and the orchestrator path's not-yet-implemented same-batch dedup).

## Implemented Features

See [ROADMAP.md](ROADMAP.md)'s "Completed" section for the full current-state feature list across every module, and [MODULES.md](MODULES.md) for per-module detail.

## Upcoming Features

See [ROADMAP.md](ROADMAP.md)'s "Planned" and "Future" sections. Headline item: wiring the AI Gateway to a real LLM provider (needs a backend proxy first — see [SECURITY.md](SECURITY.md), [DECISIONS.md](DECISIONS.md)).

## Current Status

This changelog is accurate as of the 2026-08-15 Slip Intelligence Phases 1-9 (commit `d092800`), which build on the 2026-08-11 Gallery Slip Scanner post-launch stabilization work (commit `ec75eff`), the 2026-08-08 GS/PLT epic completion, and the 2026-08-07 documentation and AI Analytics quality passes.

## Future Improvements

Adopt semantic versioning (`package.json` is still at the Vite template default `0.0.0`) once the app reaches a state worth tagging releases for — see [DEPLOYMENT.md](DEPLOYMENT.md).
