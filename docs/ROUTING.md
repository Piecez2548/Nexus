# Routing

**Last Updated:** 2026-08-18

## Overview

Routing uses **React Router 7**'s `createBrowserRouter`, defined in `src/router/router.tsx`, with every route component lazy-loaded via `src/router/lazyPages.ts`. There is a single top-level layout route (`MainLayout`) wrapping every page — there is no separate "auth" route tree, since auth/lock gating happens *above* the router entirely (see Protected Routes below).

## Routes

All routes are children of one root layout route (`path: "/"`, element `<MainLayout />`):

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
| `/categories` | `Categories` | Finance |
| `/recipients` | `RecipientProfiles` | Finance |
| `/trading` | `TradingDashboard` | Trading |
| `/trading/journal` | `TradingJournal` | Trading |
| `/trading/portfolio` | `Portfolio` | Trading |
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
financeMenus: MenuItem[]   // 10 items — financeDashboard, aiAnalytics, transactions, favorites, budget, goals, accounts, netWorth, categories, recipients
tradingMenus: MenuItem[]   // 3 items — tradingDashboard, tradingJournal, portfolio
personalMenus: MenuItem[]  // 5 items — todo, habits, schedule, vault, workouts
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

**There is no per-route protection in the router itself** — no route has an auth/lock guard attached in `router.tsx`. Instead, the *entire* `RouterProvider` is wrapped by two sequential gates in `App.tsx`:

```tsx
<ErrorBoundary>
  <AuthGate>          {/* Supabase sign-in — only active if sync is configured, see SECURITY.md */}
    <AppLockGate>      {/* device PIN/biometric lock, and the encryption catch-up/recovery flow */}
      <SyncProvider />
      <RouterProvider router={router} />
    </AppLockGate>
  </AuthGate>
</ErrorBoundary>
```

`AuthGate` renders its children with **no gate at all** if Supabase env vars are absent (`isSyncConfigured === false`) — this is deliberate, so the app never locks a user out with no configured way to sign in. When configured, it shows a spinner during session check, then `LoginScreen` if unauthenticated, else children. `AppLockGate` similarly only shows a PIN screen if App Lock has been enabled by the user. **Net effect: every route is reachable with zero configuration**, and protection only activates for features the user has explicitly opted into (sync, app lock). See [SECURITY.md](SECURITY.md) for the full gate logic.

## Lazy Loading

Every route component is lazy-loaded via `React.lazy()` in `src/router/lazyPages.ts` (one line per page, e.g. `export const Dashboard = lazy(() => import("@/features/dashboard/pages/Dashboard"));`), wrapped in a single `<Suspense fallback={<LoadingState/>}>` in `MainLayout`. This is a flat, uniform pattern — no route uses eager import, and no route group is bundled together beyond what Vite's own code-splitting produces per dynamic import. The two globally-reachable drawers (`TransactionDrawer`, `TradeDrawer`) follow the same lazy pattern but are mounted in `MainLayout` itself rather than the route tree, for the reason described above.

## Current Status

Fully implemented — 21 routes (20 named + catch-all), all lazy-loaded, all reachable without configuration.

## Future Improvements

None documented in-code. A `/settings` entry does not appear in `navItems.ts`'s three arrays (it's a standalone link in `Sidebar`/`UserMenu` instead) — consistent, not a gap.
