# Routing

On Capacitor Android, the exact `/` route opens Nexus All so tapping the installed unified app always starts at the workspace hub. Explicit routes such as `/dashboard` continue through `MainRoute` and its PIN/encryption gate. The web `/` route remains the Main dashboard; direct web Main access therefore retains its existing account/PIN policy.

**Last Updated:** 2026-09-01

## Overview

Routing uses **React Router 7**'s `createBrowserRouter`, defined in `src/router/router.tsx`, with page components lazy-loaded via `src/router/lazyPages.ts`. AccountRouteGate wraps the route tree; All is a sibling of lazy MainRoute, which mounts Main's PIN/encryption gate, SyncProvider and MainLayout.

## Routes

The Main routes below are children of the root MainRoute. `/projects` and `/projects/index.html` are separate All entries under AccountRouteGate:

| Path | Page | Nav section |
|---|---|---|
| `/` (index) and `/dashboard` | `Dashboard` | logo/home (not in `navItems.ts`) |
| `/finance` | `FinanceDashboard` | Finance |
| `/ai-analytics` | `AiAnalytics` | Finance |
| `/transactions` | `Transactions` | Finance |
| `/favorites` | `Favorites` | Finance |
| `/budget` | `Budget` | Finance |
| `/goals` | `Goals` | Finance |
| `/accounts` | `Accounts` | Finance |
| `/net-worth` | `NetWorth` | Finance |
| `/subscriptions` | `Subscriptions` | Finance |
| `/categories` | `Categories` | Finance |
| `/merchants` | `Merchants` | Finance |
| `/recipients` | `RecipientProfiles` | Finance |
| `/reports` | `Reports` | Finance |
| `/trading` | `TradingDashboard` | Trading |
| `/trading/journal` | `TradingJournal` | Trading |
| `/trading/portfolio` | `Portfolio` | Trading |
| `/trading/strategies` | `Strategies` | Trading |
| `/trading/watchlist` | `Watchlist` | Trading |
| `/trading/economic-calendar` | `EconomicCalendar` | Trading |
| `/executive` | `ExecutiveDashboard` | Personal |
| `/todo` | `Todo` | Personal |
| `/habits` | `Habits` | Personal |
| `/schedule` | `LifeSchedule` | Personal |
| `/vault` | `Vault` | Personal |
| `/workouts` | `Workouts` | Personal |
| `/settings` | `Settings` | (standalone, linked from `UserMenu`/`Sidebar`, not a menu section) |
| `*` (catch-all) | `NotFound` | — |

`/dashboard` and `/` are two paths rendering the same component (`Dashboard`) — not a redirect, both are listed explicitly in the route table.

## Navigation Flow

`src/layouts/navItems.ts` exports three arrays consumed by both the desktop sidebar and the mobile "more" menu:

```ts
financeMenus: MenuItem[]   // 13 items — financeDashboard, aiAnalytics, transactions, favorites, budget, goals, accounts, netWorth, subscriptions, categories, merchants, recipients, reports
tradingMenus: MenuItem[]   // 6 items — tradingDashboard, tradingJournal, portfolio, strategies, watchlist, economicCalendar
personalMenus: MenuItem[]  // 6 items — executive, todo, habits, schedule, vault, workouts
```

`MenuItem = { icon: LucideIcon, labelKey: string, path: string }`.

- **Desktop (`Sidebar.tsx`):** renders each array as a collapsible `NavGroup`, auto-expanding whichever group contains the currently-active route (`location.pathname.startsWith(item.path)`), plus two standalone links (`/dashboard`, `/settings`) outside any group.
- **Mobile (`MobileTabBar.tsx`):** a fixed bottom bar with only 4 hardcoded entries (`/dashboard`, `/transactions`, `/budget`, plus a central "+" FAB that opens the transaction drawer via `uiStore` rather than navigating) and a "More" button.
- **Mobile overflow (`MobileMoreMenu.tsx`):** a `Drawer` listing the *same* three `navItems.ts` arrays under section headers — the mobile equivalent of the sidebar for everything that doesn't fit in the 4-item tab bar.
- **Global Search (`GlobalSearch.tsx`):** a cross-entity search box in `TopBar` (desktop only) that indexes all 11 data stores and presumably navigates to the matching entity's page on selection.

## Layout Structure

`src/layouts/MainLayout.tsx` is the single shell every route renders inside:

```
<Sidebar />                                  (desktop only, hidden below md:)
<div>
  <TopBar />                                 (search, level badge, theme toggle, notifications, user menu)
  <main>
    <Suspense><AnimatePresence><Outlet /></AnimatePresence></Suspense>   (route content, page-transition animated)
  </main>
</div>
<MobileTabBar />                             (mobile only, hidden at md: and above)
<MobileMoreMenu />
<TransactionDrawer /> / <TradeDrawer />       (lazy-mounted globally, reachable from any page)
<ToastContainer />
<CommandPalette />
<ScanRecoveryNotice />
<PendingPaymentSheet />                      (payment-notification-capture confirm sheet, no dedicated route)
```

`TransactionDrawer` and `TradeDrawer` are lazy-loaded and only added to the component tree the first time they're actually opened (tracked via local `hasOpened*` state) — deliberately, so their dependency chain (React Hook Form, Zod, the transaction/trade schemas) isn't pulled into the bundle for every page load, only for pages that end up opening one.

## Protected Routes

AccountRouteGate protects published All/Main browser entry. Anonymous Main visits return to All sign-in with a validated local return destination. The route structure is:

```tsx
AccountRouteGate
  ProjectHub                 // All; adds AppLockGate after explicit account lock
  MainRoute
    AppLockGate              // configured PIN, biometric and encryption recovery
      SyncProvider
        MainLayout
```

Published browser builds fail closed without account configuration. Development, explicit E2E mode and installed wrappers retain local-only operation and must not be confused with published web policy. A valid account session never bypasses a configured Main PIN. All account locks invalidate older same-origin tab sessions, including reloads. Tools is a separate public utility origin; private cloud actions require independent authorization. See [SECURITY.md](SECURITY.md).

## Lazy Loading

Every route component is lazy-loaded via `React.lazy()` in `src/router/lazyPages.ts` (one line per page, e.g. `export const Dashboard = lazy(() => import("@/features/dashboard/pages/Dashboard"));`), wrapped in a single `<Suspense fallback={<LoadingState/>}>` in `MainLayout`. This is a flat, uniform pattern — no route uses eager import, and no route group is bundled together beyond what Vite's own code-splitting produces per dynamic import. The two globally-reachable drawers (`TransactionDrawer`, `TradeDrawer`) follow the same lazy pattern but are mounted in `MainLayout` itself rather than the route tree, for the reason described above.

## Current Status

Fully implemented — 29 routes (28 named + catch-all), all lazy-loaded, all reachable without configuration.

## Future Improvements

None documented in-code. A `/settings` entry does not appear in `navItems.ts`'s three arrays (it's a standalone link in `Sidebar`/`UserMenu` instead) — consistent, not a gap.
