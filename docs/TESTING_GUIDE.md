# Testing Guide

**Last Updated:** 2026-08-02

## Overview

Testing is **extensively implemented already** — unit, integration, and e2e testing all exist as real, enforced parts of the development workflow (CI runs all three on every push/PR to `main`, see `.github/workflows/ci.yml`). This document deliberately does not use "Future Unit/Integration/E2E Testing" framing, since that would misrepresent a codebase that already has **224 unit test files, 22 integration test files, and 18 end-to-end spec files.**

## Testing Strategy

Three layers, each with a distinct purpose (see [CODING_STANDARDS.md](CODING_STANDARDS.md) for the naming convention that distinguishes them):

1. **Unit tests** (`*.test.ts(x)`) — one function, hook, or store tested in isolation, collaborators mocked via `vi.mock`. The large majority of the suite (224 files) — most heavily concentrated in `src/features/finance/aiAnalytics/engine/` (pure-function calculators/analyzers are naturally unit-test-friendly) and every store/service/repository/schema across every module.
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

**Coverage (18 spec files):** accounts, ai-analytics, app-lock, budget-and-goals, categories, dashboard-period, habits, header, life-schedule, merge-duplicate-transactions, mobile (layout/responsive), navigation, portfolio, quick-add, recipient-learning, todo, trading, transactions.

**Script:** `npm run test:e2e`.

## Manual Testing

Used during active development for anything Playwright/Vitest can't easily cover — primarily the Capacitor Android build (biometric unlock, native reminders, real device sizing) and visual/design review against `UI_DESIGN_SYSTEM.md`. Not a formalized checklist in the repo; relies on the developer running `npm run dev` or a built APK and exercising the change directly. See [DEPLOYMENT.md](DEPLOYMENT.md) for how to produce a testable Android build.

## CI Enforcement

`.github/workflows/ci.yml` runs, in order, on every push/PR to `main`: lint (oxlint) → type-check (`tsc -b`) → unit/integration tests (`npm test`) → production build → Playwright browser install → e2e tests. A failure at any step fails the pipeline; the Playwright HTML report is uploaded as an artifact (14-day retention) only on failure.

## Known Test-Infrastructure Flakiness

Two integration tests (`TradingDashboard.integration.test.tsx`'s "shows zeroed stats with no trades" and `RecipientLearning.integration.test.tsx`'s "learns a recipient's category...") have been observed to intermittently fail **only** under full-parallel-suite resource contention, never when run in isolation (`npx vitest run <file>`). This is documented here as known pre-existing flakiness, not a regression to chase — re-running the full suite cleanly (with no concurrent file edits in flight) is the correct response if either shows up as a failure.

## Current Status

Fully implemented across all three testing layers, enforced in CI. This is one of the more mature parts of the project relative to its overall age (see [CHANGELOG.md](CHANGELOG.md) — the whole repo spans about 8 days of history).

## Future Improvements

- An automated `en`/`th` translation-key parity check (see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)) would be a natural addition to the CI pipeline.
- No visual-regression testing exists (no screenshot-diffing step) — worth considering given the project's explicit design-system document (`UI_DESIGN_SYSTEM.md`).
