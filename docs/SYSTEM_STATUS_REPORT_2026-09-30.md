# Nexus System Status Report — 2026-09-30

## Scope and confidence

This is a documentation snapshot of evidence currently recorded in this repository, with a focused update for the slip-scanner fixes completed on 2026-09-30. It is not a fresh end-to-end audit of every module, a production-release approval, or a deployment report. Historical reports keep their original dates and scope.

## Current disposition

| Area | Recorded state | Evidence / qualification |
|---|---|---|
| Product architecture | Local-first React/TypeScript app; feature-first modules; Dexie local persistence; optional Supabase sync/encryption; web and Capacitor Android targets | [Architecture](PROJECT_ARCHITECTURE.md), [modules](MODULES.md) |
| Slip scanner | Explicit scans, browser folder selection, date-range boundaries and OCR worker failure recovery updated | [Scanner fix](SLIP_SCANNER_SYSTEM_FIX_2026-09-30.md) |
| Scanner automated validation | Build passed; 501 scanner/database/backup tests passed; focused lint passed | `npm run lint` passed repository-wide; full repository test run reported one failure once, then was interrupted without a clean full-suite summary |
| Android scanner release check | Pending | Gradle could not establish loopback before project task configuration; `cap sync` passed but does not compile the Android app |
| Real slip/gallery behavior | Pending for the changed revision | No real slip OCR accuracy run or post-change physical Android gallery scan is claimed |
| Sync, account recovery, projects/deployables, security and release posture | See dated evidence documents; not re-executed as part of this documentation pass | Index in [docs README](README.md); release blockers and scope in [registry](RELEASE_BLOCKER_REGISTRY_2026-09-12.md) and [focused plan](FOCUSED_PLAN_2026-09-13.md) |
| Production readiness | Not declared by this report | Personal/demo scope and dated release evidence remain authoritative; no new deployment occurred |

## Severity-classified findings from this audit

- **P1 — product entry mismatch, design decision required:** on web `/` renders ScreenTutor, while `/dashboard` is Nexus Main and `/projects` is Nexus All. Native `/` differs again and opens Nexus All. `README.md`, `/docs/README.md`, and PWA metadata contain conflicting product descriptions. Do not change the root without deciding which product is meant to own the default domain/Android launcher.
- **P1 — demo answer can look authoritative:** `ScreenTutorApp` falls back to `makeDemoAnalysis()` when Ollama is unavailable; for a multiple-choice fixture that function returns option C with invented generic rationale. The README calls this a demo response, but the in-product trust/label needs review before treating ScreenTutor as a real tutor.
- **P2 — feature request absent:** no real bank-connection/provider/API flow was found; account type `bank` is a manual local account, not connected banking. Bank Connectivity must wait for provider, jurisdiction, and security design.
- **P3 — legacy data surface:** Calendar UI/type is retired but its records remain in backup/import/encryption migration and generic sync. Preserve until a data-retirement migration is approved; sync refresh is an intentional no-op.
- **P3 — documentation drift:** general Nexus descriptions in docs do not explain the current ScreenTutor web-root routing, and old scanner validation figures/status need qualification by current reports.
- **P3 — full-suite stability:** two full-suite attempts did not yield a clean complete summary in this audit window; one emitted a TopBar lazy scanner test failure, while isolated and paired execution passed (1/1 and 19/19). Treat as suspected order/runtime flake, not proof of production bug or pass.

## Subsystem status table (sampled code paths)

| System | Status | Evidence | Severity | Action |
|---|---|---|---|---|
| Transactions | Working, targeted | CRUD integration, transfer, update-in-place, export/import tests exist; sync path has focused coverage | — | Keep regression gates |
| Categories | Working, targeted | CRUD integration and duplicate merge utilities/tests | — | Keep regression gates |
| Budgets | Working, targeted | budget services/stores and dashboard integration; finance calculations are tested | — | Keep regression gates |
| Accounts | Working, targeted | CRUD integration and merge; bank is manual account type | P2 for expectation mismatch only | Don't imply bank connectivity |
| Sync | Partially verified | 50 focused sync/conflict tests pass this run; live-device/network conditions remain outside this audit | P2 | Re-run online/offline device drill before release |
| Slip Scanner | Working in automated web/native-adapter scope; runtime unverified for changed Android build | 501 tests across scanner/database/backup pass | P1 if assuming Android device-ready | Build/install APK and verify real device |
| OCR | Automated path present; real-slip quality unverified | Tesseract worker smoke + tests; no representative genuine-slip accuracy set | P2 | Create consented fixture accuracy validation |
| QR | Implemented and regression tested | extractor/parser/pipeline/duplicate tests | — | Maintain |
| Portfolio | Working, targeted | E2E spec and integration tests | — | Run browser E2E at release gate |
| Trading | Working, targeted | stores, calculations and journal integration tests | — | Clarify no broker/live-price connection |
| Net Worth | Implemented, tested; visual live click-through historically pending | store/math/snapshot tests documented in modules | P2 verification gap | Browser smoke when auth test environment available |
| Auth | Implemented for published web boundary | route gates and auth tests; current live account not tested here | P2 | Keep auth E2E/recovery drill |
| Backup | Implemented, tested | 24 backup service tests pass in focused run | — | Maintain migration coverage |
| Export | Implemented for supported finance/report paths | PDF/CSV unit tests and UI workflows | P2 (coverage varies by module) | Define export coverage per entity |
| Settings | Implemented, targeted | Settings integration coverage exists | P2 | Full browser smoke |
| AI Analytics | Local deterministic engine; tests/integration | analytics unit and page integration suite | — | Keep claims explainable/local |
| ScreenTutor | Partial MVP; web root has demo OCR/answer fallback; Electron native path unverified | `docs/SCREENTUTOR_MVP.md`, code inspection | P1 | Label/disable demo answer and validate packaged app |
| Bank connectivity | Not implemented | no provider flow found in app source | P2 | Design before implementation |
| Calendar | Retired UI; compatibility data retained | backup, sync and encryption migration references | P3 | Preserve; plan explicit deprecation only |
| Other modules (Todo/Habits/Schedule/Workout/Vault/Projects) | Implemented, test evidence per module varies | source tree + tests/E2E; not all module E2E run in this audit | P2 | Full E2E/release regression |

## Scanner data flow

Explicit user action → platform media/file provider → date-bound selection → QR/OCR extraction and worker pool → existing candidate/Smart Import flow. Automatic native startup remains incremental with QR prefiltering. The current change does not broaden automatic import rules or alter transaction records.

## Next verification order

1. Resolve the local Gradle loopback failure and build the Android debug APK.
2. Install that APK and verify permission handling, an explicit exhaustive scan, date-range inclusivity, cancellation/retry, and a representative real slip on-device.
3. Verify directory selection on supported browsers and document fallback behavior for browsers that do not return directory contents.
4. Run the broader regression/release gates before any deployment; this report itself does not certify them.

## Records updated for this snapshot

README, architecture, modules, roadmap, changelog, technical debt, testing guide, task registry, and four scanner-specific historical reports received links or dated follow-up notes. See [scanner fix](SLIP_SCANNER_SYSTEM_FIX_2026-09-30.md) for implementation evidence and limitations.
