# Nexus Full System Audit — 2026-09-30

## Executive Summary

This is a broad static/source audit plus focused validation, not certification of every feature on every target. The repository currently builds a ScreenTutor-first web root and preserves the Nexus workspace on explicit routes (and as the native app's root). The docs still mainly describe Nexus as the product root, creating an important product/deployment mismatch. No real Bank Connectivity provider exists. ScreenTutor's no-Ollama fallback can display a canned multiple-choice answer as if it were analysis. The slip scanner's current web/native-adapter paths are strongly unit/integration tested, but the changed Android code has no post-change APK/device verification.

No code was deleted or changed as part of this audit. Fixes were withheld where product choice, data-retirement policy, or UX trust semantics require an owner decision. Existing unrelated working-tree changes were preserved. No secrets were read into reports, and no deployment or external mutation was performed.

## Current Architecture

- React 19 + TypeScript + Vite 8, feature-first React modules, React Router lazy routes, Zustand feature stores.
- Domain persistence: Dexie/IndexedDB local-first; repositories/services wrap common CRUD, encryption, metadata, tombstone behavior.
- Optional Supabase: auth plus generic encrypted-record relay, MFA/key escrow and a small number of explicitly scoped server functions; not a general Nexus business API.
- Targets: Vercel web, Capacitor Android, and Electron desktop. `App.tsx` diverts web `/` to ScreenTutor; `LegacyApp` mounts Nexus routes elsewhere. Native root is Nexus All. Electron currently loads the shared `dist` root, so it also enters ScreenTutor absent a route override.
- Database source `src/database/db.ts`: 32 Dexie tables and schema versions 2–27 (26 version declarations); data compatibility for retired Calendar is retained.

## Module Inventory

Source feature folders present: automation, calendar (retired compatibility), dashboard, encryption, executive, finance (including 777 scanner/finance files), habits, lock, pairing, portfolio, projects, reminders, schedule, ScreenTutor, security, sync, todo, trading, vault, workouts. Also present: `src/ai`, `src/algoviz`, shared components/layouts, and `src/platform` infrastructure. A full file-by-file call graph was not feasible in this pass; module-level evidence and targeted paths are classified below.

## Working Systems (evidence sampled)

- Transactions: create/edit/transfer/filter integration behavior and import conflict handling are covered by tests; common local persistence and optional sync paths exist.
- Account/category CRUD and duplicate-merge utilities are implemented; account type `bank` is a manual account, not a bank connection.
- Budgets, goals, Net Worth, subscriptions, portfolio, trading journal, productivity modules, Vault, backup, reports, and security/sync infrastructure have owning routes/stores/services/repositories or explicit aggregation boundaries documented in `MODULES.md`; targeted tests exist, but not every end-to-end path was run here.
- Slip scanner: explicit exhaustive scan and automatic incremental QR path are wired through providers/processors/candidate store/Smart Import. Date-boundary, OCR pool failure, and transaction creation/dedup code have tests. Focused scanner/database/backup run passed 96 files / 501 tests.
- Supabase security headers are configured in `vercel.json`; production smoke E2E asserts CSP, X-Frame-Options and nosniff. CSP permits inline scripts/styles and wasm eval by design, which remains a hardening consideration.

## Partially Working Systems

- ScreenTutor: local/Electron vertical slice is implemented, but web root has no screen capture (browser sandbox) and no-Ollama mode uses canned demo analysis. Electron native capture/Ollama packaged behavior lacks current real-machine E2E evidence.
- Optional sync: focused tests cover engine and conflict scenarios (50 pass in this audit); these do not certify current production credentials/network, every table or real-device reconnect.
- OCR: Tesseract runtime smoke and automated parser/worker coverage exist; real slip image accuracy/false-positive rate is not measured in this audit.
- Android slip scanner: native provider and plugin are tested at unit level; changed revision failed to produce an APK because Gradle could not establish a loopback connection. Device behavior is therefore unverified.
- Full Vitest suite: first audit run emitted one TopBar lazy scanner UI test failure; isolated test and paired TopBar+GalleryScanFlow run passed (19/19). Subsequent long full-suite runs did not yield a clean final summary within the audit window. Do not interpret this as a full-suite pass.

## Broken Systems

- No verified production-code P0 integrity/security failure established in the sampled code paths.
- TopBar's “Scan Gallery” test is suite-order/runtime sensitive: one full run expected the lazy setup text before it became available, while isolated and paired execution passed. Classify as P3 test stability until reproduced as an app defect.

## Incomplete Systems

- P1: default entrypoint/product selection is inconsistent across web, native and Electron root; documentation and PWA identity conflict. Requires product-owner decision.
- P1: ScreenTutor's demo answer fallback can look factual; require conspicuous demo state or suppress answer semantics, a UX/product decision.
- P2: no Bank Connectivity backend/provider; choose institution/provider, geography, consent and threat model before design/implementation.
- P2: no current post-change Android APK/device validation for scanner; no real-slip OCR quality study.
- P2: packaged Electron capture, Thai/English OCR and live Ollama behavior need end-to-end testing.
- P3: retired Calendar UI remains as compatibility data in sync/backup/import/encryption paths; deletion risks historical user data.

## Dead/Unused Systems

- No deletion justified by this static pass. Calendar UI is retired but data references are used by backup/import/migration/sync, so it is not safely dead. Merchant seed is deliberate lookup data. The old Gallery `FullGalleryScanPanel` is already documented as removed in favor of `GalleryScanFlow`.
- Broader dead-code classification requires symbol-level reference graph and runtime/route tests; absence of a direct JSX reference alone is insufficient.

## Duplicate Systems

- Finance analytics has legacy recommendation health signals alongside weighted Health Score; docs state distinct consumers/compatibility intent. Do not merge without threshold migration tests.
- Subscription detector (derived from transaction history) and Subscription Manager (independent lifecycle) share a concept/name but different models/purpose; not duplicates.
- Scanner manual exhaustive processing and automatic QR prefilter paths are intentionally different policy paths, not duplicate implementations.
- Date/currency/storage helpers were not exhaustively compared; no consolidation recommended from this pass.

## Fake/Misleading Features

See [FAKE_FEATURE_AUDIT_2026-09-30.md](FAKE_FEATURE_AUDIT_2026-09-30.md). Highest priority: ScreenTutor demo answers and root-product identity. No bank-account connectivity, live market feed, brokerage execution, or generic AI automation should be implied by manual account/watchlist/journal features.

## Data Integrity Findings

- Dexie v16 explicitly removed `slipScannedAssets`, documented as unreleased/rebuildable, in favor of `slipScanCache`; current tests cover database schema and backup.
- 32 declared Dexie tables are represented in docs. Calendar compatibility rows are exported/imported/encryption-migrated and generically synced; preserve until explicit retire policy.
- Sync has local tombstones and focused reconnect/clock rollback/malformed-row/conflict tests; 50 sync tests passed. Equal-timestamp independent edits and server/device operation were not reverified here.
- Transactions have CSV and Smart Import duplicate guards plus utility tests. No full audit of every caller's account/category referential consistency or all restore collision modes is claimed; see [database audit](DATABASE_AUDIT_2026-09-30.md).

## Security Findings

- No `.env.local` content was accessed or printed. `.env.example` contains only public placeholders and states provider secret stays server-side.
- Supabase RLS/functions and Vercel CSP/security headers exist; production smoke has assertions. CSP uses `'unsafe-inline'` and `'wasm-unsafe-eval'`; XSS injection sweep did not identify untrusted HTML interpolation in ProjectHub—the raw imported HTML is bundled, static, and does not interpolate user data.
- IndexedDB is plaintext by default; optional encryption protects supported synced entities, and Vault is always encrypted. This is a documented local-device threat boundary, not device-forensic protection.
- No live-account authorization/penetration test or native-device review was done in this pass. See [security audit](SECURITY_AUDIT_2026-09-30.md).

## Testing Coverage

- Automated test files include unit, integration and Playwright browser spec files (exact count not regenerated in this pass) under `e2e/` (count should be regenerated before using as a KPI). Vitest is configured with four workers and jsdom; Playwright is the browser E2E layer.
- Passed this audit: build (includes TypeScript), Oxlint, bundle budget (210 JS chunks / 3782.9 KiB), scanner+DB+backup (96 files / 501 tests), sync+conflict+encrypted repository+backup (4 files / 89 tests), TopBar+Gallery paired (2 files / 19 tests). These are separate overlapping runs and must not be summed.
- A complete repository suite did not produce a clean final result in this audit; see above. ESLint is not installed/configured as a script—the project's actual lint command is Oxlint.
- E2E browser suites and Android/Electron live integrations were not run.

## Build/Lint/Typecheck Results

| Check | Result |
|---|---|
| `npm run build` | PASS — `tsc -b` and Vite production build |
| `npm run lint` | PASS — Oxlint, zero reported findings |
| TypeScript | PASS as part of build (`tsc -b`) |
| `npm run check:bundle` | PASS — 210 chunks, total 3782.9 KiB (budget accepted) |
| Full `npm test` | INCOMPLETE / one transient TopBar failure in first run; subsequent full run not completed cleanly |
| Focused scanner+database+backup | PASS — 96 files / 501 tests |
| Focused sync+conflict+encrypted repository+backup | PASS — 4 files / 89 tests |
| `npm run cap:build` | NOT RUN to completion; previous/relevant Gradle environment failure documented separately; this audit did not establish APK validity |

## Documentation Drift

- `README.md` now accurately discloses ScreenTutor root, but `docs/README.md`, several architecture/product documents, and release snapshots still frame finance-first Nexus as default root.
- Root `/` is ScreenTutor on web; Nexus All is `/projects`; Main `/dashboard`; native `/` is All. Electron loads `dist` root; PWA manifest name is ScreenTutor. Entry identity must be reconciled after owner decision.
- `docs/README.md` cites 2,782 full tests as baseline; that is a historical dated result, not the 2026-09-30 current result. New scanner report count is updated to 501 relevant tests.
- `docs/DATABASE_SCHEMA.md` has 32-table inventory but its introductory “all additive except v16” wording says no version destroys data; v16 removes an unreleased/rebuildable table, so qualify release impact carefully. No actual user-data loss established.

## Changes Actually Made

- No source/code/schema/config changes and no deletions.
- Added this report and five companion reports: dead code, fake features, database, security, cleanup plan.
- Preserved the prior scanner follow-up and prior uncommitted docs; updated current scanner test count in its report.

## Changes NOT Made

- Did not change default route/product identity; requires user decision.
- Did not suppress the ScreenTutor demo answer; UX behavior requires choice and an honest demo state.
- Did not implement Bank Connectivity, remove Calendar data/table, alter production credentials, edit user transaction data, deploy, push or commit.
- Did not modify unrelated `xauusd-ai-trader` deletions or `xauusd-pair-detector` files.

## Remaining Blockers

1. Product owner decision on default product per web, Electron and Android entry.
2. ScreenTutor demo-mode disclosure/answer semantics.
3. Resolve full-suite reliability and capture a clean complete test summary.
4. Resolve Gradle loopback; build/install Android scanner revision and verify actual media permissions/gallery/slips.
5. Run E2E suite and Electron/Ollama native validation.
6. Bank provider/design/security requirements before any Bank Connectivity work.

## Recommended Next Development Order

1. Decide product entry identity (Nexus vs ScreenTutor) and target-specific root behavior.
2. Make ScreenTutor's demo-only analysis impossible to mistake for a real answer; add behavior tests.
3. Stabilize full Vitest run and execute browser E2E.
4. Verify scanner on built Android and supported web browsers using consented test images.
5. Review database/security findings and resolve only approved items.
6. Only then begin Bank Connectivity provider/design work.
