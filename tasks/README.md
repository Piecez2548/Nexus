# Nexus Task System

A lightweight, file-based task system for all future Nexus development. It lives alongside the code so tasks, status, and the roadmap stay in one place and in version control.

## Purpose

- Track planned and in-progress work in one place ([TASK_REGISTRY.md](TASK_REGISTRY.md)).
- Give every task a stable ID that commits, PRs, and discussions can reference.
- Keep the source of truth for *what to build* next to the source of truth for *what exists* (`/docs`).

## Folder Structure

```
tasks/
├── README.md          This file — how the system works
├── TASK_REGISTRY.md   Master registry of all tasks (grouped by Epic)
├── AI/                AI Analytics engine + AI Gateway
├── Finance/           Transactions, budgets, goals, net worth, subscriptions
├── OCR/               Receipt-slip scanning (Tesseract.js)
├── Vault/             Password / secrets vault (planned)
├── Security/          App lock, auth, encryption, backup/restore, audit
├── Core/              App shell, routing, state, database, performance
└── Testing/           Unit, integration, e2e testing
```

Each Epic folder holds individual task files **once a task is started** (none exist yet — the registry is the current source of truth). Folders map 1:1 to Epics in the registry.

## Task Naming Convention

- **Task ID:** `<EPIC>-<NNN>` — a fixed Epic prefix + zero-padded number: `AI-001`, `OCR-003`, `VAULT-001`, `FIN-002`, `SEC-004`, `CORE-001`, `TEST-002`.
- **Epic prefixes:** `AI`, `FIN`, `OCR`, `VAULT`, `SEC`, `CORE`, `TEST`.
- **Task file (when created):** `tasks/<Epic>/<TASK-ID>-<kebab-title>.md`, e.g. `tasks/Vault/VAULT-001-vault-core.md`.
- IDs are never reused — retire a task by marking it `Completed`/cancelled in the registry, don't recycle its number.

## Task Lifecycle

```
Todo ──▶ In Progress ──▶ Completed
                 │
                 └──▶ Blocked ──▶ (back to In Progress once unblocked)
```

- **Todo** — planned, not started.
- **In Progress** — actively being worked on.
- **Blocked** — cannot proceed (dependency, decision, or external input needed); note why in the task file/registry.
- **Completed** — meets the Definition of Done below.

Status lives in [TASK_REGISTRY.md](TASK_REGISTRY.md); update it in the same change that moves the work forward.

## How Claude Code Should Implement Tasks

1. **Read the relevant `/docs` first** — the registry links each Epic to its doc (e.g. AI → [../docs/AI_ANALYTICS.md](../docs/AI_ANALYTICS.md)). Understand what already exists before adding anything.
2. **Follow the existing architecture and conventions** — the store → service → repository layering and naming rules in [../docs/PROJECT_ARCHITECTURE.md](../docs/PROJECT_ARCHITECTURE.md) and [../docs/CODING_STANDARDS.md](../docs/CODING_STANDARDS.md). Don't introduce a new pattern for something the codebase already solves.
3. **Respect dependencies** — don't start a task whose registry `Dependencies` are still `Todo`/`Blocked` without flagging it.
4. **Keep changes scoped** to the task; don't refactor unrelated code in passing.
5. **Never touch user data** without explicit approval — additive schema is fine, but migrations/merges/deletes of existing records need a go-ahead first.
6. **Update the registry** status as the task moves (`Todo` → `In Progress` → `Completed`).

## Definition of Done

A task is `Completed` only when all of these hold:

- [ ] Implemented and working, matching the existing architecture/conventions.
- [ ] `npm run lint` and `npx tsc -b` are clean.
- [ ] `npm test` passes (new logic has unit/integration coverage; UI/flow changes have e2e coverage where it fits — see [../docs/TESTING_GUIDE.md](../docs/TESTING_GUIDE.md)).
- [ ] Relevant `/docs` updated if the change makes them inaccurate (via the `update` workflow in `CLAUDE.md`).
- [ ] Registry status set to `Completed`.

## Review Workflow

1. **Self-review** the diff before finishing — run `/code-review` for correctness and cleanup findings.
2. **CI is the gate** — `.github/workflows/ci.yml` runs lint → type-check → tests → build → e2e on every push/PR to `main`; it must be green.
3. **Extra care for sensitive areas** — any change under `Security/`, `Vault/`, or touching `src/features/{encryption,lock,sync}` carries real data-loss/security stakes (see [../docs/SECURITY.md](../docs/SECURITY.md)) and should be reviewed with that in mind before merge.

## Extending the System

- Add a new Epic: create the folder, add a prefix here, and add a grouped table in the registry.
- Add a task: append a row to the right Epic's table in the registry (next sequential ID). Only create the individual task file when work actually starts.
