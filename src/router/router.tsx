import { createBrowserRouter } from "react-router-dom";

import MainLayout from "@/layouts/MainLayout";
import {
  Dashboard,
  FinanceDashboard,
  Transactions,
  Favorites,
  Accounts,
  Categories,
  Budget,
  Goals,
  RecipientProfiles,
  TradingDashboard,
  TradingJournal,
  Todo,
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
        path: "categories",
        element: <Categories />,
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
        path: "todo",
        element: <Todo />,
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
