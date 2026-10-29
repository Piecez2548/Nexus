# Phase 0.1–0.2 — Product Entry Consistency + ScreenTutor Demo Safety

**Date:** 2026-10-02  
**Scope:** Root routing, ScreenTutor answer integrity and focused tests only. Bank Connectivity was not started. No commit, push or deployment was performed.

## Previous Behavior

- Web `/` and `/index.html` were intercepted by `App.tsx` and rendered ScreenTutor directly. Android routed `/` to Nexus All. Electron loads the same built web root, so its root followed the ScreenTutor web path.
- PWA manifest and the initial HTML shell branded the root as ScreenTutor, while `/projects` opened Nexus All.
- ScreenTutor initialized OCR with a built-in question, treated a missing image as usable sample text, and returned a canned option-C answer when Ollama was unavailable. Plain text/empty provider responses could also be rendered as successful analysis.

## Root Cause

The platform-specific root diversion lived outside the React Router in `App.tsx`/`appEntry.ts`, while the native-only root alias lived inside the router. The ScreenTutor UI bypassed failure semantics by providing a default sample input, capture placeholder and `makeDemoAnalysis()` fallback; its parser also accepted raw response text as a normal result.

Repository evidence did not show an intentional design requiring different roots. The audit marked the product choice as pending; the supplied phase explicitly selected Nexus All as primary, resolving that decision.

## Product Entry Contract

- `/` and `/index.html` open Nexus All on the shared router; `/projects` and `/projects/index.html` remain aliases.
- `/dashboard` and other Main routes retain their existing route layout.
- ScreenTutor is lazy-loaded at `/screentutor`, remains inside `AccountRouteGate`, and is linked from Nexus All.
- The first-load HTML shell and PWA manifest identify Nexus. Root aliases and ScreenTutor routes are asserted against the actual `appRoutes` configuration.

## ScreenTutor Response Contract

- Provider states are `initializing`, `ready`, `unavailable`, `error`, and the reserved `demo` state. No production demo provider is enabled.
- New results can only come from Ollama after a non-empty structured response validates; the service explicitly sets `source: "ollama"`. Historical results without provenance display “Source not recorded.”
- The automatic canned response and default question OCR were removed. Analysis requires a saved region, a real desktop capture image, non-empty OCR, a ready provider and selected model.
- Capture absence, provider/network/status errors, timeouts, malformed JSON and empty output fail closed. The UI shows safe user-facing errors; retry rechecks provider health/model availability. Demo-like hero artwork is explicitly labeled as a sample preview, not a real inference result.
- Legacy stored data stays readable: provenance is optional in the persisted result type, while new service results are provenance-tagged.

## Files Changed

- Source/config: `src/App.tsx`, `src/appEntry.ts` (removed), `src/router/router.tsx`, `src/router/lazyPages.ts`, `src/features/projects/projectHub.html`, `src/features/screentutor/ScreenTutorApp.tsx`, `src/features/screentutor/services.ts`, `src/features/screentutor/types.ts`, `index.html`, `vite.config.ts`.
- Tests: `src/App.test.ts`, `src/features/screentutor/services.test.ts`, `src/features/screentutor/ScreenTutorApp.test.tsx`.
- Current-state documentation: `README.md`, `docs/README.md`, `docs/PROJECT_ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`, `docs/SCREENTUTOR_MVP.md`, `tasks/TASK_REGISTRY.md`, and this report.

## Tests Added/Changed

- Route-config tests: root aliases, explicit ScreenTutor route, Main route and unknown route.
- Provider tests: successful result provenance, malformed/empty output rejection, HTTP/network failures with safe messages and capture-bridge absence.
- ScreenTutor UI tests: unavailable state produces no fallback answer; Retry rechecks and recovers to connected state.
- No test timeout was increased.

## Validation Commands

- `npx tsc -b`
- `npx vitest run src/App.test.ts src/features/screentutor/services.test.ts --reporter=dot`
- `npm run build`
- `npm run lint`
- `npm test -- --reporter=dot`
- `npx vitest run src/layouts/TopBar.test.tsx --reporter=dot`
- `npx vitest run src/layouts/TopBar.test.tsx src/features/finance/slipScanner/components/GalleryScanFlow.test.tsx --reporter=dot`
- `npx vitest run src/features/sync/syncEngine.test.ts -t "propagates create, update, and delete in both directions between desktop and mobile" --reporter=dot`

## Validation Results

- TypeScript (`npx tsc -b`): PASS.
- Focused route/provider/UI tests: PASS, 3 files / 21 tests.
- Production build: PASS, includes TypeScript, Vite bundle and PWA service worker generation.
- Lint: PASS, `npm run lint` runs Oxlint and returned zero findings. There is no separate ESLint script/dependency configured in this repository.
- The focused run after all final tests were added passed all 3 files / 20 tests, including UI retry recovery and provider timeout/malformed-health handling.
- `git diff --check` and final scoped diff review are recorded after final verification.

## Full Suite Status

`npm test -- --reporter=dot` completed with exit code 1: **458 files passed, 2 failed; 2,897 tests passed, 2 failed** (2,899 total).

1. `src/layouts/TopBar.test.tsx > opens the gallery scanner from the shared top bar` could not find “Scan your gallery”. The failure was observed in this full run; the same file passed isolated (10/10), and paired with `GalleryScanFlow.test.tsx` (19/19). Its root cause remains unresolved and appears suite-order/runtime sensitive. The test harness also emits `No routes matched location "/"`; that warning alone is not proven causal.
2. `src/features/sync/syncEngine.test.ts > propagates create, update, and delete in both directions between desktop and mobile` hit the existing 5-second test timeout in the full run, but passed when run alone (1 pass, 31 skipped). No timeout was changed; this failure is outside the phase scope.

The complete run occurred before the final ScreenTutor UI tests and the two additional timeout/health tests were added. Those later tests passed in the focused 20-test run; the full suite was not rerun against that final expanded test tree.

## Known Limitations

- Web browser capture is unavailable by design; ScreenTutor correctly fails closed there. Real Electron capture + Ollama, including timeout/retry on a packaged desktop app, was not runtime-tested.
- The Android `/` result is consistent by shared route configuration, but an Android APK/device launch was not performed: **NOT RUNTIME VERIFIED**.
- Browser refresh/history behavior follows normal SPA route handling and hosting fallback; no browser E2E test was run in this phase.
- Full-suite TopBar failure root cause remains unresolved. The sync engine test also exhibited a non-reproducible isolated timeout difference.

## Unrelated Findings

- The working tree already contained many unrelated documentation modifications, untracked audit reports, extensive deletions under `xauusd-ai-trader/`, and untracked `xauusd-pair-detector/`. They were preserved and not changed as part of this phase.
- Bank Connectivity was not started. Slip Scanner, QR detection, OCR algorithms, Finance behavior, sync semantics, schemas, permissions, encryption and backup formats were not intentionally modified.

## Next Recommended Action

Run a browser E2E smoke for `/`, direct refresh of `/screentutor`, and authenticated routing, then package-test Electron capture/Ollama; independently investigate the TopBar full-suite order sensitivity.

## Completion Gate

```text
PHASE_0_1_0_2_STATUS = PARTIAL

PRODUCT_ENTRY_CONTRACT = VERIFIED
WEB_ROOT_OPENS_NEXUS_ALL = YES
ANDROID_ROOT_OPENS_NEXUS_ALL = NOT_RUNTIME_VERIFIED
SCREENTUTOR_EXPLICIT_ROUTE = VERIFIED

REAL_RESPONSE_PROVENANCE = VERIFIED
FAKE_SUCCESS_REMOVED = YES
DEMO_OUTPUT_EXPLICITLY_LABELED = YES
PROVIDER_UNAVAILABLE_SAFE = YES
PROVIDER_ERROR_SAFE = YES
RETRY_BEHAVIOR = VERIFIED

FOCUSED_TESTS = 21 PASS / 0 FAIL
BUILD = PASS
TYPECHECK = INCLUDED_IN_BUILD
LINT = PASS
FULL_TEST_SUITE = FAIL

TOPBAR_FLAKE_ROOT_CAUSE = UNRESOLVED

SOURCE_FILES_CHANGED = 10
TEST_FILES_CHANGED = 3
DOCUMENTATION_FILES_CHANGED = 8

UNRELATED_SOURCE_CHANGES = Pre-existing xauusd-ai-trader deletions and untracked xauusd-pair-detector files preserved; not modified by this phase.
DEPLOYMENT = NOT_PERFORMED
COMMIT = NOT_PERFORMED
PUSH = NOT_PERFORMED

NEXT_ACTION = Browser E2E and packaged Electron/Android route verification
```
