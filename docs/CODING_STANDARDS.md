# Coding Standards

**Last Updated:** 2026-08-02

## Overview

These conventions were extracted by reading the actual codebase — every rule below is a pattern observed repeated consistently across many files (not a preference imposed from outside). Where a convention has an exception, the exception is named.

## Naming Rules

- **Components:** `PascalCase.tsx` (`SummaryCard.tsx`, `DangerZoneSettings.tsx`).
- **Everything else** (hooks, stores, services, repositories, schemas, utils): `camelCase.ts` (`useResolvedTheme.ts`, `accountStore.ts`, `transactionService.ts`, `transactionSchema.ts`).
- **Rule Engine files:** `<ruleName>.rule.ts` (e.g. `budgetNear90.rule.ts`) — the only place a `.rule.ts` double-suffix convention is used, matching the Rule Engine's one-file-one-rule pattern (see [AI_ANALYTICS.md](AI_ANALYTICS.md)).
- **Model files** (AI Analytics only): `<name>.model.ts` (e.g. `financial-snapshot.model.ts`), kebab-case base name — the one place kebab-case appears in an otherwise camelCase/PascalCase codebase.

## File Naming (tests)

Two test suffixes, both used deliberately for different purposes:
- **`*.test.ts(x)`** — unit tests. Mocks collaborators (e.g. `transactionStore.test.ts` mocks `transactionService` via `vi.mock`), tests one unit in isolation.
- **`*.integration.test.ts(x)`** — integration tests. No mocking — exercises the real collaborator chain, often against the real Dexie instance (`fake-indexeddb`) or by rendering a full page component with Testing Library and interacting with it as a user would.

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for the full testing strategy this naming supports.

## Folder Rules

Every `src/features/<name>/` module uses the same fixed subfolder set: `components/`, `pages/`, `hooks/`, `store/`, `services/`, `repositories/`, `types/`, `schemas/`, `utils/` (not every module uses every subfolder — only the ones it needs). Shared code that isn't feature-specific lives at the top level of `src/` (`components/`, `hooks/`, `utils/`, `store/`, `layouts/`, `i18n/`, `router/`, `lib/`, `providers/`), never inside a `features/` folder. See [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) for the layering this enforces.

## TypeScript Rules

- **`@/` import alias** maps to `src/` (`tsconfig.app.json`'s `compilerOptions.paths` and `vite.config.ts`'s `resolve.alias`, kept in sync). Used for all cross-directory imports; same-directory/sibling imports still use relative paths (`./SettingsCard`).
- **Props interfaces are named `interface Props`**, not `ComponentNameProps` — confirmed in 21 of 22 checked component files. The one exception is `SummaryCard.tsx`'s `SummaryCardProps` (and a private, non-exported `TileProps` inside `DataSettings.tsx` for an internal sub-component).
- **String unions, not `enum`**, for domain vocabulary (`RecommendationPriority`, `HealthScoreGrade`, `Priority`, etc.) — explicitly chosen for structural typing and easy JSON serialization (`models/enums.ts`'s own header comment).
- **`extra?: Record<string, unknown>` as a named escape hatch**, not an index signature on the whole interface — keeps the rest of a type's fields typo-safe while still allowing forward-compatible extension (`ProviderConfiguration`, see [API_INTERFACES.md](API_INTERFACES.md)).

## React Rules

- **Components are always default-exported**: `export default function ComponentName(...)`. The one exception is `ErrorBoundary`, which is `export default class ErrorBoundary extends Component<...>` — the app's only class component, required because there is no hook equivalent of `getDerivedStateFromError`/`componentDidCatch`.
- **Hooks, stores, services, utils are always named exports** — never default. (`export function useX()`, `export const useXStore = create(...)`, `export function xSchema(...)`.)
- **`memo()` is applied surgically**, only where a documented re-render problem was found and fixed (`GlobalSearch`, `LevelBadge`, `UserMenu`, `NotificationsMenu` — see [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)), not applied by default across the component tree.
- **Lazy-loading is uniform for every route** (`React.lazy()` in `router/lazyPages.ts`) and applied ad hoc for two globally-mounted-but-rarely-opened drawers (`TransactionDrawer`, `TradeDrawer` in `MainLayout.tsx`) specifically to keep their form-library dependency chain out of every page's initial bundle.
- oxlint enforces `react/rules-of-hooks: error` and `react/only-export-components: warn` (`.oxlintrc.json`).

## Zustand Rules

Two call shapes, chosen based on whether `persist` middleware is used:
```ts
// Plain store
create<State>((set, get) => ({ ...initialAsyncState, /* domain fields */ }));

// Persisted store — curried two-call form required by Zustand's TS types
create<State>()(persist((set, get) => ({ ... }), { name: "nexus-<slug>" }));
```
Every `persist` store's `name` follows the `"nexus-<slug>"` convention (`nexus-language`, `nexus-app-settings`, `nexus-app-lock`, `nexus-gamification`, `nexus-dismissed-notifications`). Every entity store spreads `initialAsyncState` (`src/utils/asyncState.ts`) into its initial state and normalizes catch-block errors through `toErrorMessage()`. See [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) for the full fetch-on-mount/re-fetch-after-mutation pattern this supports.

## Component Rules

- **Tables always pair with `MobileRowCard`** for the `md:hidden` responsive fallback — no feature table skips this.
- **Forms always open inside `Drawer`**, never a full navigation or a separate modal-dialog component.
- **`FormField` wraps every labeled input** — the app has no form that hand-rolls its own label/error layout.

## Validation Rules (Zod + React Hook Form)

Confirmed as a strict, repo-wide convention across 12 schema files: every schema is a **factory function taking a `TranslateFn`**, not a bare `z.object`:

```ts
export function transactionSchema(t: TranslateFn) {
  return z.object({ /* ...z.string({message: t("...")})... */ }).superRefine(/* cross-field checks */);
}
export type TransactionFormData = z.infer<ReturnType<typeof transactionSchema>>;
```

Consuming forms re-derive the schema per render language: `const schema = useMemo(() => transactionSchema(t), [t]);` then `useForm({ resolver: zodResolver(schema) })`. This is why switching the app's language re-localizes validation errors instantly without remounting a form — a deliberate design decision, not incidental.

## Comment Style — the one rule enforced everywhere

**Comments explain WHY, never WHAT.** Verified consistently across every layer of the codebase read during this audit — UI components (`MobileRowCard`, `DropdownPanel`, `CircularScoreGauge`), infrastructure (`syncMeta.ts`, `asyncState.ts`, `createRepository.ts`), and the entire AI Analytics engine (every sub-engine's header comment explains its relationship to the others, never restates its own code). No file observed uses a comment that merely restates what the following line of code already says. This matches the general instruction this documentation itself is written under, and should be treated as a hard rule for new code, not just an observed tendency.

## Clean Architecture Principles

- **Strict, one-directional layering**: pages → components/hooks → stores → services → repositories → database (see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)). UI code never imports Dexie or a repository directly.
- **Factories for the common case, hand-written for the exception** — `createRepository`/`createCrudService` cover ~12/~9 standard-shaped repositories/services; anything with real extra logic is hand-written and the factory files' own comments name every exception by file, so the boundary is documented, not implicit.
- **Zero circular dependencies**, verified via `madge` (see [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md)) — a standing constraint, not a coincidence.
- **i18n as a structural constraint, not a UI afterthought** — validation schemas and even some non-React async functions (`enableEncryption`, `importBackup`) take a `TranslateFn` parameter so error messages are never hardcoded in one language.

## Current Status

All conventions above are actively enforced across the codebase with the specific, named exceptions listed (not silently violated elsewhere) — confirmed by direct reading of a representative sample from every layer during this documentation sprint.

## Future Improvements

None documented in-code. If the team grows beyond a single contributor, formalizing these observed conventions into an oxlint custom rule set (currently minimal — `.oxlintrc.json` only sets 2 rules) would make them enforced rather than merely consistent by habit.
