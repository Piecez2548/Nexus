# Component Library

**Last Updated:** 2026-08-18

## Overview

Shared, cross-feature UI lives under `src/components/` — nothing here is specific to one domain module. Feature-specific components (e.g. `TransactionForm.tsx`, `TradeDrawer.tsx`) live inside their own `src/features/<name>/components/` instead and are documented in [MODULES.md](MODULES.md). Everything below was read in full to confirm its actual props and usage, not inferred from naming.

## Shared Components — `src/components/ui/` (21 components)

### Cards & Data Display

| Component | Props | Purpose | Used by |
|---|---|---|---|
| `SummaryCard` | `title, value, icon, color?, change?, invertChange?, changeLabel?, info?` | KPI tile (title + info icon, colored icon badge, value, change badge) | 5 places (Dashboard, Trading, Portfolio, AI Analytics forecast/cash-flow) |
| `ChangeBadge` | `value: number \| null, invert?` | Up/down % delta pill; `invert` flips green/red for metrics where "more" is bad (e.g. expenses) | 5 places, mostly internal to `SummaryCard` |
| `IconBadge` | `icon, color, size?` (default 36) | Colored icon box, the app's standard entity-type marker | 8 places |
| `MobileRowCard` | `leading?, title, subtitle?, trailing?, meta?, actions?` | The `md:hidden` mobile counterpart to every desktop `<table>` row | 7 places |
| `ProgressBar` | `percentage, colorClass?` | Clamped 0-100 fill bar | 11 places (budgets, goals, forecasts, current-activity cards) |

### Charts

| Component | Props | Purpose | Used by |
|---|---|---|---|
| `ChartCard` | `title, headerExtra?, children` | The standard bordered shell every Recharts chart sits in | **17 places** — the single most-reused chart wrapper in the app |
| `ChartLegend` | `items: {label, color}[]` | Colored-dot legend row | 1 place (`CashFlowSection`) |
| `CircularScoreGauge` | `score, size?, strokeWidth?, colorClass?, label?` | Hand-rolled SVG radial gauge (Recharts has no radial-gauge primitive) | 5 places, all AI Analytics score displays |

### Overlays & Popovers

| Component | Props | Purpose | Used by |
|---|---|---|---|
| `Drawer` | `open, onClose, children` | Right-side sliding panel, the app's primary "form in a panel" pattern. `role="dialog"`/`aria-modal`, focus moves in on open and returns to the trigger on close, Tab/Shift+Tab trap within the panel, Escape closes it — via the shared `useModalA11y` hook (found missing entirely in the full architecture review; fixed as the review's #2 priority item) | **27 files** (31 JSX usages) — every feature's add/edit forms, re-verified 2026-08-18 |
| `DropdownPanel` | `open, className?, children` | Bare fade+scale entrance/exit wrapper, no chrome of its own | 4 places (`InfoTooltip`, `GlobalSearch`, `NotificationsMenu`, `UserMenu`) |
| `InfoTooltip` | `text, align?` (default `"right"`) | Small "i" button toggling a `DropdownPanel` popover, closes on outside click | 2 places (Dashboard cards/charts) |
| `AuthBackdrop` | `children` | Full-screen gradient-blob shell for sign-in/PIN/recovery gates | 2 places (`AppLockGate`, `AuthGate`) |

### Form Fields

| Component | Props | Purpose | Used by |
|---|---|---|---|
| `FormField` | `label, htmlFor, error?, children` | Label + input slot + inline error — the standard form-field wrapper | **27 places** — the single most-used component in the entire repo |
| `TagsInput` | `id?, value: string[], onChange, placeholder?` | Comma-separated tag input, commits on blur | 1 place (`TradeMetaFields`) |
| `FileField` | `id?, value?, onChange` | Single-file input, base64 data-URL | **0 places — dead code**, see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) |
| `MultiFileField` | `id?, values: string[], onChange` | Multi-image picker with thumbnail grid | 1 place (`TradeMetaFields`) |

### Feedback & State

| Component | Props | Purpose | Used by |
|---|---|---|---|
| `LoadingState` | `label?` (default `"Loading..."`, not i18n'd) | Centered spinner + label | **19 places** — the standard `loading` branch |
| `ErrorState` | `message, onRetry` | Bordered error card + retry, i18n'd | **18 places** — paired with `LoadingState` in almost every page |
| `ErrorBoundary` | `children` | The app's only class component (needed for `getDerivedStateFromError`); reports to Sentry | 1 place — mounted once at the root (`App.tsx`) by design |
| `ToastContainer` | *(none — reads `useToastStore`)* | Fixed top-right animated toast stack | 1 place — mounted once at the root (`MainLayout.tsx`) by design |

### Chrome

| Component | Props | Purpose | Used by |
|---|---|---|---|
| `ThemeToggleSwitch` | *(none)* | iOS-style dark/light toggle | 1 place (`Sidebar`) |

## Layout Components — `src/layouts/`

Documented in full in [ROUTING.md](ROUTING.md) and [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md): `MainLayout`, `Sidebar`, `TopBar`, `MobileTabBar`, `MobileMoreMenu`, `GlobalSearch`, `UserMenu`, `NotificationsMenu`, `LevelBadge`.

## Charts (library usage)

All data visualization uses **Recharts**, always wrapped in `ChartCard`. There is no second charting library in the app — `CircularScoreGauge` is the one deliberate exception, hand-rolled in SVG specifically because Recharts has no radial-gauge primitive.

## Forms

Every form in the app follows the same stack: **React Hook Form + Zod**, with `FormField` as the visual wrapper for each input. Validation schemas are factory functions taking a `TranslateFn` (`schema(t)`) so error messages re-localize instantly on language switch — see [CODING_STANDARDS.md](CODING_STANDARDS.md) for the full pattern and [API_INTERFACES.md](API_INTERFACES.md) for the `TranslateFn` contract. Forms are opened inside a `Drawer`, never a full-page navigation or a modal dialog library.

## Tables

There is no shared `<Table>` component — each feature builds its own desktop `<table>` (e.g. `TransactionTable`, `TradeHistoryTable`, `AccountTable`) paired with `MobileRowCard` as the responsive `md:hidden` fallback. This is a deliberate, consistent pattern across the app (7 tables follow it), not a missing abstraction — see [CODING_STANDARDS.md](CODING_STANDARDS.md).

## Dialogs

There is no separate "Dialog" component — `Drawer` (a slide-in side panel) is used uniformly for every add/edit form and confirmation flow that would otherwise be a modal dialog. The one exception is destructive top-level actions (e.g. "Reset All Data" in `DangerZoneSettings.tsx`), which use the browser's native `window.confirm()` rather than a custom dialog component.

## Settings & Import/Export panels — `src/components/settings/`, `src/components/importExport/`

Full breakdown in [MODULES.md](MODULES.md) under Sync/Encryption/Lock, and in [SECURITY.md](SECURITY.md)/[DEPLOYMENT.md](DEPLOYMENT.md) for their data-handling behavior. `SettingsCard`/`SettingsGroup` are the two structural components every settings panel is built from.

## Current Status

All 21 `ui/` components are implemented and in active use except `FileField.tsx` (built, zero importers — see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).

Re-verified 2026-08-18 against `src/components/ui/` directly: still exactly 21 components, no additions or removals. The `vault/`, `workouts/`, and `security/` feature modules added since the last pass (see [PROJECT_TREE.md](PROJECT_TREE.md)) each bring their own feature-scoped components (`VaultEntryCard`/`VaultEntryForm`, `WorkoutExerciseCard`/`WorkoutEntryCard`/`WorkoutTimerDrawer`/`WorkoutTimerRing`/`WorkoutGpsTrackerDrawer`/`WorkoutRouteMap`, `AuditLogDrawer`) plus `finance/notificationCapture/`'s `PendingPaymentSheet` — consistent with this doc's existing scope, none of these belong here; they're documented in [MODULES.md](MODULES.md) alongside every other feature's own components (e.g. `TransactionForm.tsx`, `HabitCard.tsx`), not in this shared-`components/`-only file.

## Future Improvements

Remove or document the intended future use of `FileField.tsx`. `DropdownPanel` has the same focus-management gap `Drawer` had before the 2026-08-18 architecture review's fix above — no `role="menu"`, no focus handling, no Escape-to-close — tracked as the review's #7 priority item, not yet done (it also has no `onClose` prop today, unlike `Drawer`, so wiring it in needs a small API change first).
