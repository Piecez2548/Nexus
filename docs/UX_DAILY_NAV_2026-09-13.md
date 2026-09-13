# Daily navigation simplification — 2026-09-13

## Change

The main desktop sidebar now starts with three daily-use destinations: Dashboard, Transactions and Budget. The remaining routes stay available under grouped “All features” sections. Mobile keeps the existing bottom bar for those daily destinations and removes their duplicate links from the More drawer.

## Why

The previous sidebar presented 25 routes at the same level of discovery. Progressive disclosure reduces the first decision to the three tasks most people repeat while preserving every existing route and URL.

## Validation

- Full Vitest: 451 files / 2,844 tests passed.
- TypeScript, Oxlint, release build and bundle budget passed.
- Impeccable detector returned no findings for the changed navigation surfaces.
- Physical mobile tap-through remains pending because no native device controller is exposed in the current session.
