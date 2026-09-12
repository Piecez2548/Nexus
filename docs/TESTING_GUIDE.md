# Testing Guide

**Last Updated:** 2026-09-13

## Current regression groups

`npx vitest run src/features/sync/syncConflict.test.ts --maxWorkers=1` executes the synthetic offline/conflict/outage drill: **17/17 pass without expected failures**, including both reconnect orders, clock rollback, encrypted peer convergence, failed-upload retry, malformed remote data, edits during pull and v2 repair of an existing stuck cursor. Run `src/database/localSyncWrite.test.ts` for restart, two-connection concurrency, cursor floors and failed-batch rollback. Encryption migration tests cover version monotonicity when switching storage format. See [SC-003 evidence](SYNC_CONFLICT_FIX_003_2026-09-12.md) for current validation.

The counts dated August 29 below are historical. Current remediation evidence is in [AUDIT_REMEDIATION_2026-09-01.md](AUDIT_REMEDIATION_2026-09-01.md).

- `npm test`: unit/integration suite, bounded to four workers to avoid worker startup saturation.
- `npx playwright test --workers=2`: local functional E2E build; excludes dedicated auth/login configurations and skips timing benchmarks.
- `npx playwright test --config=e2e/auth-entry.config.ts`: synthetic authenticated build, account/PIN and multi-tab lock regressions.
- `npx playwright test --config=e2e/login.config.ts`: login accessibility/validation on the same synthetic-config build, no fixed dev port.
- `npx cross-env NEXUS_PERFORMANCE=1 playwright test e2e/release-readiness.spec.ts --grep "mobile constrained" --workers=1`: isolated existing performance budget. Do not run concurrently with builds or large test pools. CI runs it as a separate step.
- `npx playwright test --config=e2e/production-smoke.config.ts --grep "preserves anonymous"`: read-only published Main/All login, public Tools catalogue and unauthenticated private cloud API rejection.
- `npx playwright test e2e/core-smoke.spec.ts`: local production-build smoke covering Dashboard entry, synthetic income/expense creation, summary totals, reload persistence and navigation to the saved transaction rows.
- `npx playwright test e2e/mobile.spec.ts e2e/transactions.spec.ts`: desktop and 390px mobile transaction CRUD, including mobile reload persistence.
- `npx vitest run src/features/sync/syncEngine.test.ts src/features/sync/components/SyncProvider.test.tsx src/features/sync/tombstones.test.ts src/features/sync/store/authStore.test.ts`: sync propagation, deletion safety, signed-in orchestration and the five-second/background-online triggers. The two-device regression alternates isolated desktop/mobile local states against one stateful cloud relay in both directions.
- `syncEngine.test.ts` also blocks a later unrelated `economicEvents` pull and asserts that a successfully applied transaction has already refreshed its store while `runFullSync()` is still pending. This protects the early-refresh latency fix without weakening the final post-dedupe refresh.
- `encryptedRepository.test.ts` verifies unchanged encrypted envelopes reuse their decrypted content without sharing mutable return values, an updated envelope is decrypted again, and a replacement session DEK cannot reuse plaintext cached under the previous key.

Use local-date helpers for date-only fixtures; do not generate local-month budget fixtures by UTC truncation. Select form controls with exact labels or specific IDs when filter labels overlap. Do not weaken contrast assertions or benchmark thresholds to hide failures. Diagnostic artifacts belong under `.impeccable/e2e/`, excluded from Vitest.

For account/PIN recovery, run `npx vitest run src/features/encryption src/features/lock src/features/sync src/store/appLockStore.test.ts src/store/appLock/lockSignal.test.ts src/database/encryptedRepository.test.ts src/database/backupService.test.ts --maxWorkers=4` and `npx playwright test --config=e2e/auth-entry.config.ts --grep "account recovery"`. Successful recovery fixtures must use real ciphertext encrypted with the recovered key. Negative cases must preserve the previous PIN/key wrap and data. Browser tests cover 390px and 1280px against intercepted synthetic auth/escrow endpoints; they must never reset a real user's credentials. See [verification](ACCOUNT_RECOVERY_VERIFICATION_2026-09-12.md).

## Overview

Testing is **extensively implemented already** — unit, integration, and e2e testing all exist as real, enforced parts of the development workflow (CI runs all three on every push/PR to `main`, see `.github/workflows/ci.yml`). As verified on 2026-08-29, the repository has **436 Vitest unit/integration files and 23 Playwright end-to-end spec files**: 2,740 Vitest cases and 76 Playwright cases, all passing in the validated runs described under Known Test-Infrastructure Flakiness.

## Testing Strategy

Three layers, each with a distinct purpose (see [CODING_STANDARDS.md](CODING_STANDARDS.md) for the naming convention that distinguishes them):

1. **Unit tests** (`*.test.ts(x)`) — one function, hook, or store tested in isolation, collaborators mocked via `vi.mock`. These form the large majority of the 436-file Vitest suite and are most heavily concentrated in `src/features/finance/aiAnalytics/engine/`; repositories, services, stores, schemas, hooks, and utilities across the other modules are covered as well. Some plain `.test.ts` files intentionally exercise real fake-indexeddb-backed Dexie behavior and are functionally integration-style despite their filename.
2. **Integration tests** (`*.integration.test.ts(x)`) — no mocking. Either exercises a store against the real Dexie instance (via `fake-indexeddb`), or renders a full page component with Testing Library and interacts with it as a user would (`Transactions.integration.test.tsx`, `Dashboard.integration.test.tsx`, `RecipientLearning.integration.test.tsx`, etc.).
3. **End-to-end tests** (Playwright, `e2e/*.spec.ts`) — a real Chromium browser against a real built-and-served app, covering full user flows across page boundaries (navigation, mobile layout, cross-feature flows like "add a transaction, see it reflected on the dashboard").

`backupService.test.ts` includes the application-level disaster-recovery contract. Its complete drill imports one synthetic row into every user-content table with encryption enabled, verifies encrypted storage, exports portable JSON, clears every content table, restores the backup, and compares all restored values and row counts. Keep the explicit 25-table oracle current when a new user-content table is added; device-local operational tables remain deliberately excluded.

## Unit Testing

**Runner:** Vitest, configured inline in `vite.config.ts`'s `test` block — `environment: "jsdom"`, `setupFiles: ["./src/tests/setup.ts"]`, e2e directory excluded.

**Global setup** (`src/tests/setup.ts`): imports `@testing-library/jest-dom/vitest` matchers and `fake-indexeddb/auto` (so any test that touches Dexie gets a real in-memory IndexedDB implementation, not a mock); forces the language store to `"en"` before every test (documented reason: "the app defaults to Thai... but every existing test asserts on English UI text — force English globally so the i18n migration doesn't require rewriting hundreds of existing assertions. Tests that specifically exercise the language toggle set their own state"); calls Testing Library's `cleanup()` after every test.

**Scripts:** `npm test` (run once), `npm run test:watch`, `npm run test:coverage` (`@vitest/coverage-v8`).

## Integration Testing

Same Vitest runner, same config — the distinction from unit tests is purely about *what's mocked*, not tooling. A store's `.integration.test.ts` typically has `describe("<store> (Dexie integration)", ...)` with no `vi.mock` calls at all, proving the store correctly round-trips through the real repository/service/Dexie chain. A page's `.integration.test.tsx` renders the full component tree and drives it via `@testing-library/user-event`, proving the whole store → service → repository chain plus the UI wired on top of it works together.

## End-to-End Testing

**Runner:** Playwright (`@playwright/test`), config in `playwright.config.ts`. Runs against a real production build (`npm run build && npm run preview -- --port 4173`), not the dev server — `fullyParallel: true`, 2 retries on CI only, trace captured on first retry.

**Environment isolation for e2e specifically:**
- Supabase env vars are force-unset for the e2e build (`VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY=`), specifically so the sign-in gate never triggers during e2e — every spec assumes it's already "inside" the app. The gate itself is covered separately by `AuthGate.test.tsx`/`LoginScreen.test.tsx` with a mocked Supabase client, not a real network round-trip in e2e.
- `VITE_SENTRY_DSN` is also unset, so a developer's real local Sentry DSN doesn't get flooded with e2e console noise or genuine test failures.
- `storageState: "./e2e/storageState.json"` pre-seeds the language-toggle localStorage key to English for the same reason as the unit-test setup file — every spec asserts on English UI text.

**Coverage (23 spec files / 76 cases):** accounts, ai-analytics, app-lock, budget-and-goals, categories, dashboard-period, economic calendar, executive dashboard, habits, header, life-schedule, merge-duplicate-transactions, mobile (layout/responsive), navigation, portfolio, quick-add, recipient-learning, reports, strategies, todo, trading, transactions, and watchlist.

**Script:** `npm run test:e2e`.

## Manual Testing

Used during active development for anything Playwright/Vitest can't easily cover — primarily the Capacitor Android build (biometric unlock, native reminders, real device sizing) and visual/design review against `UI_DESIGN_SYSTEM.md`. Not a formalized checklist in the repo; relies on the developer running `npm run dev` or a built APK and exercising the change directly. See [DEPLOYMENT.md](DEPLOYMENT.md) for how to produce a testable Android build.

For cross-device sync acceptance, use two independently persisted clients signed in to the same account. Record a shared baseline, then create, edit and delete in each direction. After every edit, verify both the visible field values and that the receiving client still contains exactly one row for the record. Repository-level test payloads must match the real form shape and must not copy stored `syncId` or `updatedAt` into the update request; otherwise the test can hide identity-generation defects. Remove all synthetic records and confirm both clients return to the baseline.

## CI Enforcement

`.github/workflows/ci.yml` runs, in order, on every push/PR to `main`: lint (oxlint) → type-check (`tsc -b`) → unit/integration tests (`npm test`) → production build → Playwright browser install → e2e tests. A failure at any step fails the pipeline; the Playwright HTML report is uploaded as an artifact (14-day retention) only on failure.

## Known Test-Infrastructure Flakiness

Full-suite runs can exceed jsdom interaction timing budgets when Vitest uses the machine's unrestricted default worker count, especially if Build or Playwright runs concurrently. The stable validation command on this workstation is `npx vitest run --maxWorkers=4`; on 2026-08-29 it passed all 436 files / 2,740 cases. `RecipientLearning.integration.test.tsx` now waits for the asynchronous recipient-profile write it actually asserts and has a test-local 15-second integration budget. The orchestrated Slip Scanner integration no longer assumes which concurrent worker wins an identical-content hash race; it asserts that exactly one copy survives.

Playwright requires permission to launch Chromium in restricted execution environments. A sandboxed launch can make every case fail immediately before page setup; that is a runner failure, not an application regression. The unrestricted 2026-08-29 run passed all 76 cases in about 1.2 minutes.

## Current Status

Fully implemented across all three testing layers, enforced in CI. This is one of the more mature parts of the project relative to its overall age (see [CHANGELOG.md](CHANGELOG.md) — the whole repo spans about 8 days of history).

## Future Improvements

- An automated `en`/`th` translation-key parity check (see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)) would be a natural addition to the CI pipeline.
- No visual-regression testing exists (no screenshot-diffing step) — worth considering given the project's explicit design-system document (`UI_DESIGN_SYSTEM.md`).
