import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";

import AccountRouteGate from "./AccountRouteGate";
import {
  Dashboard,
  FinanceDashboard,
  AiAnalytics,
  Transactions,
  Favorites,
  Accounts,
  NetWorth,
  Subscriptions,
  Categories,
  Merchants,
  Budget,
  Goals,
  RecipientProfiles,
  Reports,
  ExecutiveDashboard,
  TradingDashboard,
  TradingJournal,
  Strategies,
  Watchlist,
  EconomicCalendar,
  Todo,
  Habits,
  Portfolio,
  LifeSchedule,
  Vault,
  Workouts,
  Settings,
  NotFound,
  ProjectHub,
  ScreenTutor,
} from "./lazyPages";

import PasswordRecoveryScreen from "@/features/sync/components/PasswordRecoveryScreen";
import AlgoVizRedirect from "./AlgoVizRedirect";
const projectHub = <Suspense fallback={null}><ProjectHub /></Suspense>;
const MainRoute = lazy(() => import("./MainRoute"));
export const appRoutes = [
  { path: "/forgot-password", element: <Suspense fallback={null}><PasswordRecoveryScreen /></Suspense> },
  { id: "algoviz-redirect", path: "/algoviz/*", element: <AlgoVizRedirect /> },
  { id: "screentutor", path: "/screentutor", element: <Suspense fallback={<div aria-busy="true">Loading ScreenTutor…</div>}><ScreenTutor /></Suspense> },
  { element: <AccountRouteGate />, children: [
  { id: "nexus-all-root", path: "/", element: projectHub },
  { id: "nexus-all-index", path: "/index.html", element: projectHub },
  { id: "nexus-all-projects", path: "/projects", element: projectHub },
  { id: "nexus-all-projects-index", path: "/projects/index.html", element: projectHub },
  {
    element: <Suspense fallback={null}><MainRoute /></Suspense>,
    children: [
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "finance",
        element: <FinanceDashboard />,
      },
      {
        path: "ai-analytics",
        element: <AiAnalytics />,
      },
      {
        path: "transactions",
        element: <Transactions />,
      },
      {
        path: "favorites",
        element: <Favorites />,
      },
      {
        path: "budget",
        element: <Budget />,
      },
      {
        path: "goals",
        element: <Goals />,
      },
      {
        path: "accounts",
        element: <Accounts />,
      },
      {
        path: "net-worth",
        element: <NetWorth />,
      },
      {
        path: "subscriptions",
        element: <Subscriptions />,
      },
      {
        path: "categories",
        element: <Categories />,
      },
      {
        path: "merchants",
        element: <Merchants />,
      },
      {
        path: "recipients",
        element: <RecipientProfiles />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "trading",
        element: <TradingDashboard />,
      },
      {
        path: "trading/journal",
        element: <TradingJournal />,
      },
      {
        path: "trading/portfolio",
        element: <Portfolio />,
      },
      {
        path: "trading/strategies",
        element: <Strategies />,
      },
      {
        path: "trading/watchlist",
        element: <Watchlist />,
      },
      {
        path: "trading/economic-calendar",
        element: <EconomicCalendar />,
      },
      {
        path: "executive",
        element: <ExecutiveDashboard />,
      },
      {
        path: "todo",
        element: <Todo />,
      },
      {
        path: "habits",
        element: <Habits />,
      },
      {
        path: "schedule",
        element: <LifeSchedule />,
      },
      {
        path: "vault",
        element: <Vault />,
      },
      {
        path: "workouts",
        element: <Workouts />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
  ] },
];

export const router = createBrowserRouter(appRoutes);
