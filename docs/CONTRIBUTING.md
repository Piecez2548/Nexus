# Contributing

**Last Updated:** 2026-08-02

## Overview

Nexus is currently a **single-contributor project** — `git log` shows one author across all 52 commits, one branch (`main`) exists locally and on `origin`, and there is no pre-existing `CONTRIBUTING.md`, no `.husky` git hooks, and no pull request history. This document describes the workflow actually observed in the repository today, plus sensible guidance for anyone joining in the future, rather than inventing a multi-team process that doesn't exist yet.

## Coding Workflow

1. Read [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) and [CODING_STANDARDS.md](CODING_STANDARDS.md) first — the layering rules (pages → stores → services → repositories → database) and naming conventions are consistently enforced across the whole codebase, and new code is expected to match them.
2. For a change inside an existing feature module, follow that module's established shape (see [MODULES.md](MODULES.md)) — don't introduce a new pattern for something the codebase already has a convention for.
3. Before committing, run the same checks CI runs (see `.github/workflows/ci.yml`):
   ```bash
   npm run lint       # oxlint
   npx tsc -b         # type-check
   npm test           # unit + integration tests
   npm run build      # production build
   npm run test:e2e   # Playwright (slower — run when touching UI/routing/cross-page flows)
   ```
4. Prefer editing existing files over creating new ones; keep changes scoped to what's actually needed (see [CODING_STANDARDS.md](CODING_STANDARDS.md)'s "comments explain why" rule — the same restraint applies to scope).

## Commit Style

Observed convention across the git history (see [CHANGELOG.md](CHANGELOG.md) for real examples): a short, imperative-mood summary line ("Add Habit Tracker," "Fix sync engine race that resurrected deleted rows on refresh," "Consolidate duplicated math, remove dead code, and reconcile health-score UI in AI Analytics"), optionally followed by a blank line and a longer body explaining **why** the change was made when it's not obvious from the summary alone — several commits (the encryption-at-rest staged rollout, the AI Analytics introduction) use multi-paragraph bodies to explain design rationale, not just list what changed. Match this style: summary states the change, body (if present) states the reasoning.

## Branch Strategy

**Currently: none — all commits go directly to `main`.** This works for a single contributor but should change before a second person joins. `.github/workflows/ci.yml` already supports both `push` and `pull_request` triggers on `main`, so the infrastructure for a PR-based workflow exists even though it isn't used yet. If/when this project grows past one contributor, the recommended path (not yet adopted) is: feature branches off `main`, PRs opened against `main`, CI required to pass before merge.

## Pull Request Guidelines

No PRs have been opened against this repository yet, so there is no established template or convention to document as "current practice." If opening one:
- Keep it scoped to one logical change (matching the commit-style convention above — the git history shows even large features like AI Analytics landing as one deliberate, well-described commit rather than an accumulation of unrelated changes).
- Ensure all CI checks pass (lint, type-check, unit/integration tests, build, e2e) before requesting review.
- Reference the relevant `/docs` file(s) your change affects, and update them in the same PR if the change makes them inaccurate — this documentation set is only useful if it stays synchronized with the code (see `CLAUDE.md`'s `update` command).

## Review Process

No review process exists today (solo contributor, no PR history). For future contributors, at minimum: a second person should review any change touching `src/features/encryption/`, `src/features/lock/`, or `src/features/sync/` before merge, given the real data-loss/security stakes documented in [SECURITY.md](SECURITY.md) and [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

## Current Status

Solo-contributor workflow, direct commits to `main`, CI-gated but not PR-gated.

## Future Improvements

Adopt a branch + PR workflow once a second contributor joins, using the CI triggers that already exist. Consider adding `.husky` pre-commit hooks (lint + type-check) to catch issues before they even reach CI, given none exist today.
