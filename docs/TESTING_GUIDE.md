# Testing Guide

**Last Updated:** 2026-08-29

## Overview

Testing is **extensively implemented already** — unit, integration, and e2e testing all exist as real, enforced parts of the development workflow (CI runs all three on every push/PR to `main`, see `.github/workflows/ci.yml`). As verified on 2026-08-29, the repository has **436 Vitest unit/integration files and 23 Playwright end-to-end spec files**: 2,740 Vitest cases and 76 Playwright cases, all passing in the validated runs described under Known Test-Infrastructure Flakiness.

## Testing Strategy

Three layers, each with a distinct purpose (see [CODING_STANDARDS.md](CODING_STANDARDS.md) for the naming convention that distinguishes them):

1. **Unit tests** (`*.test.ts(x)`) — one function, hook, or store tested in isolation, collaborators mocked via `vi.mock`. These form the large majority of the 436-file Vitest suite and are most heavily concentrated in `src/features/finance/aiAnalytics/engine/`; repositories, services, stores, schemas, hooks, and utilities across the other modules are covered as well. Some plain `.test.ts` files intentionally exercise real fake-indexeddb-backed Dexie behavior and are functionally integration-style despite their filename.
2. **Integration tests** (`*.integration.test.ts(x)`) — no mocking. Either exercises a store against the real Dexie instance (via `fake-indexeddb`), or renders a full page component with Testing Library and interacts with it as a user would (`Transactions.integration.test.tsx`, `Dashboard.integration.test.tsx`, `RecipientLearning.integration.test.tsx`, etc.).
3. **End-to-end tests** (Playwright, `e2e/*.spec.ts`) — a real Chromium browser against a real built-and-served app, covering full user flows across page boundaries (navigation, mobile layout, cross-feature flows like "add a transaction, see it reflected on the dashboard").

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
