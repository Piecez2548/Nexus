# Contributing to Nexus

Thank you for helping improve Nexus. Contributions should preserve the project's local-first architecture, privacy boundaries, and existing behavior.

## Before you start

- Read [AGENTS.md](AGENTS.md) for repository-specific engineering rules.
- Read the relevant module documentation in [docs/README.md](docs/README.md).
- Never commit credentials, API keys, customer data, screenshots containing personal data, or generated build output.

## Development workflow

1. Create a focused branch from `main`.
2. Keep business logic in the appropriate feature service/store layer rather than inside React presentation components.
3. Reuse existing repositories, stores, hooks, and shared UI components.
4. Add or update focused tests for behavior changes.
5. Update documentation when architecture, behavior, or scope changes.
6. Run the quality gates before opening a pull request:

   ```bash
   npm run lint
   npx tsc -b
   npm test
   npm run build:release
   ```

## Pull requests

Keep each pull request focused and describe the user-visible result. Include the files changed, validation commands and results, known limitations, and any migration or deployment notes. Do not include secrets or real user data in the description.

## Reporting security issues

Do not disclose a vulnerability in a public issue. Follow the private reporting guidance in [SECURITY.md](SECURITY.md).
