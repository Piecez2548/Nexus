import {
  ChartColumn,
  Wallet,
  Star,
  PiggyBank,
  Target,
  Landmark,
  Tags,
  Users,
  LineChart,
  BookOpen,
  ListChecks,
  Flame,
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  icon: LucideIcon;
  labelKey: string;
  path: string;
}

export const financeMenus: MenuItem[] = [
  { icon: ChartColumn, labelKey: "nav.financeDashboard", path: "/finance" },
  { icon: Wallet, labelKey: "nav.transactions", path: "/transactions" },
  { icon: Star, labelKey: "nav.favorites", path: "/favorites" },
  { icon: PiggyBank, labelKey: "nav.budget", path: "/budget" },
  { icon: Target, labelKey: "nav.goals", path: "/goals" },
  { icon: Landmark, labelKey: "nav.accounts", path: "/accounts" },
  { icon: Tags, labelKey: "nav.categories", path: "/categories" },
  { icon: Users, labelKey: "nav.recipients", path: "/recipients" },
];

export const tradingMenus: MenuItem[] = [
  { icon: LineChart, labelKey: "nav.tradingDashboard", path: "/trading" },
  { icon: BookOpen, labelKey: "nav.tradingJournal", path: "/trading/journal" },
];

export const personalMenus: MenuItem[] = [
  { icon: ListChecks, labelKey: "nav.todo", path: "/todo" },
  { icon: Flame, labelKey: "nav.habits", path: "/habits" },
];
