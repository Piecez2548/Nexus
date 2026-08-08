# Platform (PLT) Epic — Design & Reuse Map

**Last Updated:** 2026-08-08

## Purpose

The PLT epic specifies cross-cutting platform frameworks. Per the project rules in `CLAUDE.md` ("Reuse existing services… Do not redesign the architecture unless explicitly requested") and the user's decision to **implement only the genuinely-new frameworks**, this document records, for each PLT item, either:

- **Implemented (new)** — a genuinely new capability the app lacked, built under `src/platform/`.
- **Satisfied by existing** — the capability already exists in the app (or in the GS epic); re-implementing it would duplicate/redesign working code. Pointers are given.
- **Design (not implemented)** — specified as design-only, or partially covered with the remaining gap described rather than built.

This keeps the platform coherent without rewriting systems that already work.

## Implemented (new) — under `src/platform/`

- **PLT-002 Event Bus** — `eventBus.ts`. App-wide pub/sub (publish/subscribe, priority, async, bounded history, replay, wildcard). Tested.
- **PLT-008 Feature Flags** — `featureFlags.ts` + `featureFlagStore.ts`. Local flags, experimental (dev-only) gating, overrides, rollback. Tested.
- **PLT-018 Command Palette** — `commandPalette/`. Global Ctrl/Cmd+K palette with fuzzy search over nav + actions; mounted in `MainLayout`. Tested.
- **PLT-019 Local Telemetry** — `localTelemetry.ts`. On-device timings/errors/memory/startup; never sends data online. Tested.

## Satisfied by existing systems (not re-implemented — reuse rule)

- **PLT-003 Background Task Engine** → GS-033 `backgroundWorker` (queue/retry/pause/resume/cancel), GS-007 concurrent scan queue, and GS-006 session persistence + GS-037 recovery ("survive restart"). Priority/scheduling covered by GS-023 scheduler.
- **PLT-004 File Import Framework** → the app's existing CSV/JSON import (`backupService`, `ImportTransactionsPanel`, transaction CSV import) + the GS `MediaProvider` image import. New formats plug in via the same provider/importer pattern.
- **PLT-005 Export Framework** → existing CSV/PDF/JSON export (`backupService`, jspdf-based transaction/trading exports) + GS-050 report JSON/CSV serialisers.
- **PLT-006 Notification Center** → `toastStore` + `notificationStore` + the `reminders/` native-notification module (success/warning/error/progress).
- **PLT-007 Audit Log** → GS-017 `scanAuditLog` + GS-038 `securityAudit` (permission/import/delete/validation/suspicious, searchable/filterable). Currently scanner-scoped; an app-wide audit would generalise the same append-only + injectable-sink design.
- **PLT-009 Settings Framework** → `appSettingsStore` + the Settings page's per-module sections; import/export/versioning via `backupService`.
- **PLT-010 Configuration Manager** → `appSettingsStore` (defaults/validation) + Vite `.env` environment profiles + PLT-008 feature flags.
- **PLT-011 Global Search** → existing `GlobalSearch` + `useGlobalSearch` (searches every entity type). Fuzzy matching is available via the PLT-018 palette's `fuzzyScore` if extended.
- **PLT-016 Local AI Gateway** → existing `src/ai/` gateway (`AIProvider`, `LocalRuleProvider`) — a designed, provider-agnostic seam. Wiring Ollama/LM Studio/remote providers is tracked as forward work in ROADMAP (needs a backend proxy for remote keys).
- **PLT-017 AI Memory** → GS-045 `learningStore` (merchant/OCR/bank-naming) + GS-043 `categoryLearningStore` + the existing recipient-learning engine. All local.

## Design (specified design-only or partial + gap)

- **PLT-001 Plugin SDK** — *design-only per spec ("Do not implement").* The app already realises the plugin pattern where it matters: the GS epic's `BankPlugin` registry (GS-011/030) and swappable `MediaProvider` / `ScanCache` / `QrDecoder` / `OcrTextRecognizer` / `SmartImportDeps` interfaces. A general Plugin SDK would generalise this "registry + typed interface + register()" pattern to banks/OCR/AI/importers/exporters/analytics/validators, with sandboxing via capability-scoped registration. Not implemented.
- **PLT-012 Filter Engine** — partially covered by existing filters (`TransactionToolbar`, GS-015 `importPreview` filter, GS-035 `importHistoryFilter`). A reusable generic engine would extract the shared predicate-composition (date/amount/merchant/bank/category/status). Design; not extracted to avoid churn.
- **PLT-013 Table Engine** — existing tables (`TransactionTable`, trading tables) cover sort/filter/export; pagination + virtualization are the remaining enhancement. Design.
- **PLT-014 Dashboard Framework** — existing Dashboard renders per-module preview panels; dynamic widget registration + drag/drop/resize/persisted layout is the enhancement. Design.
- **PLT-015 Widget SDK** — extends PLT-014; a widget contract (charts/KPIs/lists/actions) over the existing Dashboard cards. Design.

## Certification

See PLT-020 in [../TASK_REGISTRY.md](../TASK_REGISTRY.md) for the platform certification review (full gate + doc sync).
