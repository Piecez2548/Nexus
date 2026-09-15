import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Capacitor } from "@capacitor/core";

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
} from "./lazyPages";

import PasswordRecoveryScreen from "@/features/sync/components/PasswordRecoveryScreen";
import AlgoVizLayout from "@/algoviz/components/layout/AlgoVizLayout";
import AlgoVizHomePage from "@/algoviz/pages/AlgoVizHomePage";
import AlgoVizModulePage from "@/algoviz/pages/AlgoVizModulePage";
const projectHub = <Suspense fallback={null}><ProjectHub /></Suspense>;
const MainRoute = lazy(() => import("./MainRoute"));
const native = Capacitor.isNativePlatform();

export const router = createBrowserRouter([
  { path: "/forgot-password", element: <Suspense fallback={null}><PasswordRecoveryScreen /></Suspense> },
  {
    path: "/algoviz",
    element: <AlgoVizLayout />,
    children: [
      { index: true, element: <AlgoVizHomePage /> },
      { path: "search", element: <AlgoVizModulePage /> },
      { path: "pathfinding", element: <AlgoVizModulePage /> },
      { path: "sorting", element: <AlgoVizModulePage /> },
      { path: "compare", element: <AlgoVizModulePage /> },
    ],
  },
  { element: <AccountRouteGate />, children: [
  { path: "/projects", element: projectHub },
  { path: "/projects/index.html", element: projectHub },
  ...(native ? [{ path: "/", element: projectHub }] : []),
  {
    // Native reserves the exact root for All while retaining every explicit
    // Main child route under this pathless layout. Web keeps its existing root.
    path: native ? undefined : "/",
    element: <Suspense fallback={null}><MainRoute /></Suspense>,
    children: [
      ...(!native ? [{
        index: true,
        element: <Dashboard />,
      }] : []),
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
]);
