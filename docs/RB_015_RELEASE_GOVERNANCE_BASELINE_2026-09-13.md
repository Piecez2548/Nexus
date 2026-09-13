# RB-015 — Source candidate and release governance baseline (2026-09-13)

## Engineering evidence

- Nexus `main` currently points to `763f82d`; the working tree is clean and the commit is pushed to `Piecez2548/Nexus`.
- `.github/workflows/ci.yml` runs on `main` pushes and pull requests and includes npm audit, reproducible SBOM generation, lint, TypeScript, unit/integration tests, release build, Playwright, auth/layout and performance checks.
- The current local repository exposes only `main`; the repository documentation records a direct-to-main solo workflow. No checked-in CODEOWNERS or release-approval record was found.

This is a candidate traceability baseline, not release approval. Branch protection, required reviewers/checks, deployment approval, privileged-access review, rollback owner and a signed candidate/tag remain unassigned. RB-015 is **In Progress** pending an appointed Engineering/Release owner and repository-settings evidence.
