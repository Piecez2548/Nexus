# Phase 0.3 — Full Regression Reliability

**Date:** 2026-10-02  
**Scope:** Reproduce and investigate the reported full-suite-only TopBar gallery and sync-engine failures; establish the full regression gate. No product feature work, unrelated cleanup, commit, push, or deployment was performed.

## Executive Summary

The reported failures did not reproduce in this workspace. The exact full-suite command passed twice consecutively, each time with 461 test files and 2,904 tests passing. The previously failing TopBar lazy Gallery test and sync-engine timeout test also passed in focused runs, as did the Phase 0.1–0.2 route and ScreenTutor tests. Build/typecheck and lint passed.

The original failures are therefore not currently observable, but their historical root causes remain unresolved: there is not enough evidence to attribute them to a production defect, test-isolation bug, resource leak, or runner contention. No speculative code or timeout changes were made. The Phase 0.3 reliability gate is **PASS** according to its explicit criteria; this does not certify a specific explanation for the earlier intermittent failures.

## Original Failures

The supplied Phase 0.3 request reported two failures among 2,899 tests: `TopBar.test.tsx` could not find “Scan your gallery” during the full suite, and a sync-engine test exceeded its timeout. Both reportedly passed independently. Those original logs were not available in this task; the evidence below is from fresh runs against the current workspace.

## Reproduction Evidence

- Exact full-suite command: `npm test -- --reporter=dot` (`npm test` invokes `vitest run`).
- Vitest configuration: `vite.config.ts`; jsdom environment, `src/tests/setup.ts`, four workers, default file isolation retained.
- Both fresh full-suite runs passed, so the historical failures were **not reproduced**.
- No arbitrary sleeps, test retries, skipped tests, weakened assertions, concurrency reduction, or timeout changes were used.

## TopBar Root Cause

**UNRESOLVED — not reproduced.** The path is a module-level `React.lazy(() => import(...GalleryScanFlow))`, rendered in `Suspense` after the TopBar gallery action is activated. The TopBar harness creates a fresh `MemoryRouter` at `/`; it does not register a matching `/` route, which accounts for the observed “No routes matched location `/`” warning. That warning is not evidence that it caused the missing-text failure.

The test was run alone and paired with `GalleryScanFlow.test.tsx`, and it passed in both contexts. The two full suites also passed. Inspection did not establish a leaking mock, timer, route state, platform mock, listener, worker, or pending import affecting this path. No TopBar or scanner change is justified by the present evidence.

## Sync Engine Root Cause

**UNRESOLVED — not reproduced.** The target test performs sequential create/update/delete checks in both directions using a local in-memory cloud mock and Dexie state. A full sync processes multiple tables with bounded pull concurrency. The isolated target test passed; no retry/backoff or external network dependency was implicated by its test setup. Repeated full runs also passed.

The observed historical timeout could be consistent with transient runner/resource pressure, but no evidence distinguishes that from an intermittent test or environment issue. This is an inference, not a confirmed cause. No sync-engine or timeout change was made.

## Test Isolation Findings

- Vitest has four workers and default test-file isolation; no forced serial mode was configured.
- Global test setup performs Testing Library cleanup after each test.
- TopBar tests reset the relevant Zustand stores and local Dexie tables before each test; the Gallery flow tests reset their local selections, notifications, and scanner/import state.
- The sync-engine file resets its mocked query state and relevant Dexie tables before each test. Its target test uses a local Supabase mock.
- Fake-timer tests found during targeted inspection restore real timers in cleanup hooks. No specific cross-file contamination was demonstrated.
- Test-order narrowing could not identify a contaminating test because the failure did not recur in the full-suite reruns.

## Resource Leak Findings

No confirmed resource leak related to either reported failure was found in the inspected setup and target paths. Global DOM cleanup is present; scanner OCR workers are not started simply by rendering the initial gallery flow without an image. This was a targeted audit of the implicated setup and files, not proof that the entire repository has no resource leaks. Full-run warnings included jsdom navigation-not-implemented output and expected malformed-sync-row logging; neither failed a test.

## Production Bugs Found

**0 confirmed.** Historical intermittent failures did not provide a reproducible production defect.

## Test Bugs Found

**0 confirmed.** No assertion was changed. The TopBar test harness route warning is noted above but is not proven to be a bug or cause.

## Files Changed

- Source files: **0**
- Test files: **0**
- Documentation files: **2** — this report and `docs/README.md` (current entry-point link only)
- No files under `xauusd-ai-trader/` or `xauusd-pair-detector/` were touched by this phase.

## Validation Commands

- `npm test -- --reporter=dot`
- `npx vitest run src/layouts/TopBar.test.tsx --reporter=dot`
- `npx vitest run src/layouts/TopBar.test.tsx src/features/finance/slipScanner/components/GalleryScanFlow.test.tsx --reporter=dot`
- `npx vitest run src/features/sync/syncEngine.test.ts -t "propagates create, update, and delete in both directions between desktop and mobile" --reporter=dot`
- `npx vitest run src/App.test.ts src/features/screentutor/services.test.ts src/features/screentutor/ScreenTutorApp.test.tsx --reporter=dot`
- `npm run build` (includes `tsc -b` typecheck and Vite production/PWA build)
- `npm run lint` (Oxlint; no separate ESLint script is configured)
- `git diff --check`

## Focused Results

- TopBar alone: **1 file, 10 tests passed**.
- TopBar + GalleryScanFlow: **2 files, 19 tests passed**.
- Sync-engine target: **1 test passed** (31 other tests intentionally deselected by the test-name filter; none skipped in the suite configuration).
- Phase 0.1–0.2 route/provider/UI regression: **3 files, 21 tests passed**.
- Combined focused coverage recorded here: **41 unique tests passed across 51 executions** (the TopBar tests ran in both the standalone and paired contexts); results are reported separately because the contexts differ.

## Full Suite Run #1

- Result: **461 files passed; 2,904 tests passed; 0 failed**.
- Duration: **659.36 seconds**.
- Vitest timing: transform 17.62s; setup 395.40s; import 163.50s; tests 150.09s; environment 1,727.09s.
- Exit code: 0.

## Full Suite Run #2

- Result: **461 files passed; 2,904 tests passed; 0 failed**.
- Duration: **684.81 seconds**.
- Vitest timing: transform 18.13s; setup 421.44s; import 171.82s; tests 141.55s; environment 1,793.06s.
- Exit code: 0.
- This run immediately followed Run #1 with no source or test changes between runs.

## Build Result

**PASS.** `npm run build` completed TypeScript project build, Vite production bundle, and PWA service-worker generation with exit code 0.

## Lint Result

**PASS.** `npm run lint` (Oxlint) completed with exit code 0 and no findings.

## Known Limitations

- The historical failures could not be reproduced, so their root causes cannot be confirmed or fixed safely from current evidence.
- A third full-suite run was not performed: the two required consecutive runs took approximately 22.4 minutes combined, in addition to focused and build/lint validation.
- Browser/native runtime verification is outside this regression task.

## Unrelated Findings

The working tree contained many pre-existing unrelated modifications, deletions, and untracked files before this phase. They were preserved. `git diff --check` emitted line-ending conversion warnings for existing files; it did not report whitespace errors. This task did not modify the previously deleted `xauusd-ai-trader/` files or the untracked `xauusd-pair-detector/` directory.

## Remaining Blockers

No blocker remains for the Phase 0.3 pass gate. The intermittent original root causes remain unresolved and should be revisited only if a failure recurs with a captured log/reproducer. Android build and physical-device verification remain outside this phase.

## Next Recommended Action

Proceed to **Phase 0.4 — Android Build & Physical Device Verification**; do not start Bank Connectivity as part of this phase.

## Completion Gate

```text
PHASE_0_3_STATUS = PASS
TOPBAR_FAILURE_REPRODUCED = NO
TOPBAR_ROOT_CAUSE = UNRESOLVED
TOPBAR_FIX = NONE
SYNC_TIMEOUT_REPRODUCED = NO
SYNC_TIMEOUT_ROOT_CAUSE = UNRESOLVED
SYNC_TIMEOUT_FIX = NONE
PRODUCTION_BUGS_FOUND = 0 confirmed
TEST_ISOLATION_BUGS_FOUND = 0 confirmed
RESOURCE_LEAKS_FOUND = 0 confirmed in inspected paths
FOCUSED_TESTS = 41 unique PASS / 0 FAIL (51 executions including repeated TopBar tests)
FULL_RUN_1 = 2904 PASS / 0 FAIL
FULL_RUN_2 = 2904 PASS / 0 FAIL
FULL_RUN_3 = NOT_RUN
BUILD = PASS
TYPECHECK = INCLUDED_IN_BUILD
LINT = PASS
PHASE_0_1_0_2_REGRESSION = NONE
SOURCE_FILES_CHANGED = 0
TEST_FILES_CHANGED = 0
DOCUMENTATION_FILES_CHANGED = 2
TESTS_SKIPPED_TO_FORCE_PASS = 0
ASSERTIONS_WEAKENED = 0
ARBITRARY_TIMEOUT_INCREASES = 0
DEPLOYMENT = NOT_PERFORMED
COMMIT = NOT_PERFORMED
PUSH = NOT_PERFORMED
NEXT_ACTION = Phase 0.4 — Android Build & Physical Device Verification
```
