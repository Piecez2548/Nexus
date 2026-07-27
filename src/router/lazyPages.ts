import { lazy } from "react";

export const Dashboard = lazy(() => import("@/features/dashboard/pages/Dashboard"));
export const FinanceDashboard = lazy(() => import("@/features/finance/pages/FinanceDashboard"));
export const Transactions = lazy(() => import("@/features/finance/pages/Transactions"));
export const Favorites = lazy(() => import("@/features/finance/pages/Favorites"));
export const Accounts = lazy(() => import("@/features/finance/pages/Accounts"));
export const Categories = lazy(() => import("@/features/finance/pages/Categories"));
export const Budget = lazy(() => import("@/features/finance/pages/Budget"));
export const Goals = lazy(() => import("@/features/finance/pages/Goals"));
export const RecipientProfiles = lazy(() => import("@/features/finance/pages/RecipientProfiles"));
export const TradingDashboard = lazy(() => import("@/features/trading/pages/TradingDashboard"));
export const TradingJournal = lazy(() => import("@/features/trading/pages/TradingJournal"));
export const Todo = lazy(() => import("@/features/todo/pages/Todo"));
export const Habits = lazy(() => import("@/features/habits/pages/Habits"));
export const Portfolio = lazy(() => import("@/features/portfolio/pages/Portfolio"));
export const Calendar = lazy(() => import("@/features/calendar/pages/Calendar"));
export const Settings = lazy(() => import("@/pages/Settings"));
export const NotFound = lazy(() => import("@/pages/NotFound"));
