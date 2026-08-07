# Nexus Project Instructions

## General Rules

- Follow the existing project architecture.
- Reuse existing services, repositories, stores, hooks, and shared components whenever possible.
- Do not duplicate business logic.
- Do not redesign the architecture unless explicitly requested.
- Keep business logic outside React components.
- Preserve deterministic behavior.
- Preserve existing functionality.
- Minimize code changes.
- Always run Build, TypeScript, ESLint, and related tests after implementation.

---

## Custom Commands

### update

When I say **update**, do the following:

- Update every file inside `/docs`.
- Synchronize documentation with the current implementation.
- Do not invent features.
- Mark unfinished work as Planned.
- Update architecture documentation.
- Update roadmap.
- Update changelog.
- Update technical debt.
- Update TASK_REGISTRY.md.
- Update ENGINEERING_AUDIT.md if scores or technical debt changed.
- Review documentation consistency before finishing.

---

### review

Perform a complete System Architecture Review.

Do not modify code.

Generate a report only.

Include:

- Architecture
- Performance
- Accessibility
- Security
- Maintainability
- Technical Debt
- Suggested Refactoring Order

---

### refactor

Apply the approved improvements from the latest review.

Rules:

- Preserve all functionality.
- Preserve business logic.
- Do not redesign the architecture.
- Minimize code changes.
- Build after major changes.
- Run TypeScript.
- Run ESLint.
- Run related tests.
- Update documentation if implementation changes.

---

### task

When I provide a task (for example A11Y-001, PERF-001, UX-001):

- Complete only that task.
- Do not start the next task automatically.
- Reuse the existing architecture.
- Do not expand the scope.
- After completion provide:
  - Files modified
  - Validation results
  - Summary
  - Remaining issues
  - Recommendation for the next task

Stop after the requested task is complete.