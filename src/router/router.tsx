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
  Todo,
  Habits,
  LifeSchedule,
  Vault,
  Workouts,
  Settings,
  NotFound,
  ProjectHub,
} from "./lazyPages";

import PasswordRecoveryScreen from "@/features/sync/components/PasswordRecoveryScreen";
import AlgoVizRedirect from "./AlgoVizRedirect";
const projectHub = <Suspense fallback={null}><ProjectHub /></Suspense>;
const MainRoute = lazy(() => import("./MainRoute"));
export const appRoutes = [
  { path: "/forgot-password", element: <Suspense fallback={null}><PasswordRecoveryScreen /></Suspense> },
  { id: "algoviz-redirect", path: "/algoviz/*", element: <AlgoVizRedirect /> },
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
