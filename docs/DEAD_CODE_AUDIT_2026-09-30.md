# Dead Code Audit — 2026-09-30

## Method and limits

Inspected tracked source/module inventory, route table, imports for selected systems, Dexie declarations and data references, TODO/FIXME/stub markers, and build/lint. This was not a whole-program TypeScript symbol graph or runtime coverage of every route; no deletion is justified by this pass.

## Findings

| Item | Evidence | Classification | Action |
|---|---|---|---|
| Calendar UI/module | `src/features/calendar/` retains a type; no UI route/store is present. `calendarEvents` is still referenced in backup export/import/clear, encryption migration, sync whitelist and Dexie. `syncEngine.ts` has an intentional no-op refresher comment. | Retired feature with live compatibility/data-path code; not dead data code | Preserve. Revisit only with explicit backup/import/sync migration plan. |
| `slipScannedAssets` | Dexie v16 declares `slipScannedAssets: null`; v16 code comment identifies it as unreleased/rebuildable and replaced by `slipScanCache`. | Obsolete schema artifact already removed, documented | No further action. |
| `FullGalleryScanPanel` | Roadmap/debt records prior prototype removed after confirming shipping `GalleryScanFlow` owns orchestration. Current scanner flow and tests exist. | Confirmed prior cleanup | No action. |
| Merchant data seed | `src/database/seed.ts` inserts reference merchants, not sample financial transactions; merchant table is intentionally not synced. | Active reference-data bootstrap | Keep; avoid calling it fake transactions. |
| `return null` / empty callbacks | Search returns many intentional React conditional renders and helper optionals. The Calendar sync refresh no-op is explicitly commented. | Heuristic hits, not dead code proof | No bulk action. |
| Modules with sparse direct dependencies | Feature roots and lazy routes mean low textual reference count can still mean active. | Uncertain | Mark SUSPECTED UNUSED only after route/import/runtime confirmation; no candidates removed. |

## Outcome

Dead/unused systems removed: 0. Suspected items requiring human confirmation: possible residual Calendar retirement policy only; source is currently used for compatibility. No source deletion.
