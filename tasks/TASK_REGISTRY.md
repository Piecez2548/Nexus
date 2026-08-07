# Task Registry

Master registry of all planned and completed Nexus tasks, grouped by Epic. See [README.md](README.md) for conventions and lifecycle.

**Last Updated:** 2026-08-07

## Legend

- **Priority:** `Critical` · `High` · `Medium` · `Low`
- **Status:** `Todo` · `In Progress` · `Completed` · `Blocked`
- `Completed` reflects the **current implementation state** verified against `/docs` — this registry is both a backlog and an honest as-built view. Items marked `Todo` are genuinely not yet in the codebase (confirmed by direct code check, per the project rule to never claim features that don't exist).

## Status Summary

| Epic | Total | Completed | Todo | In Progress | Blocked |
|---|---|---|---|---|---|
| AI Analytics | 7 | 7 | 0 | 0 | 0 |
| Slip Scanner (OCR) | 7 | 5 | 2 | 0 | 0 |
| Vault | 4 | 0 | 4 | 0 | 0 |
| Finance | 4 | 1 | 3 | 0 | 0 |
| Security | 4 | 2 | 2 | 0 | 0 |
| Core | 3 | 3 | 0 | 0 | 0 |
| Testing | 3 | 3 | 0 | 0 | 0 |
| Accessibility | 2 | 2 | 0 | 0 | 0 |
| Performance | 2 | 2 | 0 | 0 | 0 |
| UX | 2 | 2 | 0 | 0 | 0 |
| **Total** | **38** | **27** | **11** | **0** | **0** |

---

## AI Analytics

Backing engine + UI all built — see [../docs/AI_ANALYTICS.md](../docs/AI_ANALYTICS.md). AI-001–AI-007 map to the Executive Summary report and the sub-engines it aggregates.

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| AI-001 | AI Analytics | Executive Summary | Critical | Completed | AI-003, AI-004, AI-006 |
| AI-002 | AI Analytics | Overall Assessment | High | Completed | — |
| AI-003 | AI Analytics | Behavior Analysis | High | Completed | — |
| AI-004 | AI Analytics | Forecast | High | Completed | — |
| AI-005 | AI Analytics | Risk Analysis | High | Completed | AI-004 |
| AI-006 | AI Analytics | Recommendations | High | Completed | — |
| AI-007 | AI Analytics | Action Plan | Medium | Completed | AI-006 |

---

## Slip Scanner (OCR)

On-device Tesseract.js scanning — see [../docs/MODULES.md](../docs/MODULES.md) (Finance module). Engine, gallery/batch scan, preview, and import exist; bank-selection popup and slip-specific duplicate detection are not yet in the code.

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| OCR-001 | Slip Scanner | Bank Selection Popup | Low | Todo | — |
| OCR-002 | Slip Scanner | Gallery Scanner | Medium | Completed | OCR-003 |
| OCR-003 | Slip Scanner | OCR Engine | High | Completed | — |
| OCR-004 | Slip Scanner | Slip Validation | Medium | Completed | OCR-003 |
| OCR-005 | Slip Scanner | Duplicate Detection | Medium | Todo | OCR-003 |
| OCR-006 | Slip Scanner | Preview | Medium | Completed | OCR-003 |
| OCR-007 | Slip Scanner | Import | High | Completed | OCR-006 |

---

## Vault

Password / secrets vault — **planned, not started** (see [../docs/ROADMAP.md](../docs/ROADMAP.md)). Would build on the existing client-side encryption primitives (see [../docs/SECURITY.md](../docs/SECURITY.md)).

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| VAULT-001 | Vault | Vault Core | High | Todo | — |
| VAULT-002 | Vault | Password Manager | Medium | Todo | VAULT-001 |
| VAULT-003 | Vault | Secure Notes | Medium | Todo | VAULT-001 |
| VAULT-004 | Vault | Recovery Keys | Medium | Todo | VAULT-001 |

---

## Finance

Core transactions/budgets/goals are built; net worth and a first-class subscription manager are on the roadmap — see [../docs/ROADMAP.md](../docs/ROADMAP.md).

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| FIN-001 | Finance | Budget Improvements | Medium | Todo | — |
| FIN-002 | Finance | Net Worth Improvements | Medium | Todo | — |
| FIN-003 | Finance | Financial Goals | High | Completed | — |
| FIN-004 | Finance | Subscription Manager | Medium | Todo | — |

> `FIN-002 Net Worth` and `FIN-004 Subscription Manager` have no base implementation yet — these tasks cover building the feature, not just improving it. `FIN-001 Budget Improvements` extends an already-shipped Budget feature.

---

## Security

Backup/restore built via `backupService`; a permission manager and audit log are not yet in the code — see [../docs/SECURITY.md](../docs/SECURITY.md).

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| SEC-001 | Security | Permission Manager | Medium | Todo | — |
| SEC-002 | Security | Audit Log | Medium | Todo | — |
| SEC-003 | Security | Backup | High | Completed | — |
| SEC-004 | Security | Restore | High | Completed | SEC-003 |

---

## Core

Foundational layers — all in place. Performance work (lazy loading, narrow selectors + `memo`, selective store refresh) is done for now but inherently ongoing — see [../docs/PROJECT_ARCHITECTURE.md](../docs/PROJECT_ARCHITECTURE.md) and [../docs/STATE_MANAGEMENT.md](../docs/STATE_MANAGEMENT.md).

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| CORE-001 | Core | Financial Core | Critical | Completed | — |
| CORE-002 | Core | AI Core | Critical | Completed | CORE-001 |
| CORE-003 | Core | Performance Core | High | Completed | — |

---

## Testing

Infrastructure + baseline coverage established (224 unit, 22 integration, 18 e2e files) — see [../docs/TESTING_GUIDE.md](../docs/TESTING_GUIDE.md). `Completed` here means the layer exists and is CI-enforced; new features still add their own tests under each layer.

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| TEST-001 | Testing | Unit Tests | High | Completed | — |
| TEST-002 | Testing | Integration Tests | High | Completed | — |
| TEST-003 | Testing | End-to-End Tests | High | Completed | — |

---

## Accessibility

Cross-cutting accessibility work. A11Y-001 added screen-reader labels (a shared `ChartFigure` `role="img"` wrapper) and keyboard semantics across the AI Analytics charts — see [Accessibility/A11Y-001.md](Accessibility/A11Y-001.md) and [../docs/AI_ANALYTICS.md](../docs/AI_ANALYTICS.md).

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| A11Y-001 | Accessibility | AI Analytics Accessibility Pass | Medium | Completed | — |
| A11Y-002 | Accessibility | Focus Rings, Chart Data Tables & Empty-state Polish | Medium | Completed | A11Y-001 |

> A11Y-002 delivered the A11Y-001 follow-ups: a global keyboard `:focus-visible` ring, visually-hidden data tables for the key charts (score radars, health trend, monthly cash flow), a no-flags empty state, and an `overflow-x-auto` wrapper on the desktop merchant table. Remaining: data tables for the secondary charts (their aria-label headline covers them for now).

---

## Performance

AI Analytics engine performance passes — both are output-preserving optimizations of the analyzer/trend pipeline, see [../docs/TECHNICAL_DEBT.md](../docs/TECHNICAL_DEBT.md).

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| PERF-001 | Performance | Analyzer Cache Optimization | Medium | Completed | — |
| PERF-002 | Performance | Eliminate Duplicate buildScoreContext Computation | Medium | Completed | — |

> PERF-003 (share `now` across the analysis/trend hooks to dedupe the trend's "current" point; optional Web Worker offload) is scoped but not yet registered — it needs a small UI-level change deliberately excluded from PERF-002.

---

## UX

AI Analytics user-experience fixes.

| Task ID | Epic | Title | Priority | Status | Dependencies |
|---|---|---|---|---|---|
| UX-001 | UX | Replace Full Page Reload with Analysis Re-run | Low | Completed | — |
| UX-002 | UX | Harden AI Analytics Retry & Error Handling | Medium | Completed | UX-001 |

> UX-002 fixed the synchronous-engine-throw hang (a sync throw now surfaces as an error state instead of leaving the page on `loading`) and made retry re-fetch the finance data before re-analysing. Remaining: surfacing store-level data-load errors as their own `ErrorState` — they currently fall through to the empty state — which is not yet a registered task.
