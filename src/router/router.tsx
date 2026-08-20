import { createBrowserRouter } from "react-router-dom";

import MainLayout from "@/layouts/MainLayout";
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
} from "./lazyPages";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
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
]);
