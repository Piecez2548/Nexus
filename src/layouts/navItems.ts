import {
  ChartColumn,
  Wallet,
  Star,
  PiggyBank,
  Target,
  Landmark,
  Tags,
  Store,
  Users,
  LineChart,
  BookOpen,
  BookMarked,
  Eye,
  CalendarClock,
  Briefcase,
  ListChecks,
  Flame,
  Clock,
  Sparkles,
  KeyRound,
  Dumbbell,
  Scale,
  Repeat,
  FileBarChart,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  icon: LucideIcon;
  labelKey: string;
  path: string;
}

export const financeMenus: MenuItem[] = [
  { icon: ChartColumn, labelKey: "nav.financeDashboard", path: "/finance" },
  { icon: Sparkles, labelKey: "nav.aiAnalytics", path: "/ai-analytics" },
  { icon: Wallet, labelKey: "nav.transactions", path: "/transactions" },
  { icon: Star, labelKey: "nav.favorites", path: "/favorites" },
  { icon: PiggyBank, labelKey: "nav.budget", path: "/budget" },
  { icon: Target, labelKey: "nav.goals", path: "/goals" },
  { icon: Landmark, labelKey: "nav.accounts", path: "/accounts" },
  { icon: Scale, labelKey: "nav.netWorth", path: "/net-worth" },
  { icon: Repeat, labelKey: "nav.subscriptions", path: "/subscriptions" },
  { icon: Tags, labelKey: "nav.categories", path: "/categories" },
  { icon: Store, labelKey: "nav.merchants", path: "/merchants" },
  { icon: Users, labelKey: "nav.recipients", path: "/recipients" },
  { icon: FileBarChart, labelKey: "nav.reports", path: "/reports" },
];

export const tradingMenus: MenuItem[] = [
  { icon: LineChart, labelKey: "nav.tradingDashboard", path: "/trading" },
  { icon: BookOpen, labelKey: "nav.tradingJournal", path: "/trading/journal" },
  { icon: Briefcase, labelKey: "nav.portfolio", path: "/trading/portfolio" },
  { icon: BookMarked, labelKey: "nav.strategies", path: "/trading/strategies" },
  { icon: Eye, labelKey: "nav.watchlist", path: "/trading/watchlist" },
  { icon: CalendarClock, labelKey: "nav.economicCalendar", path: "/trading/economic-calendar" },
];

export const personalMenus: MenuItem[] = [
  { icon: LayoutGrid, labelKey: "nav.executive", path: "/executive" },
  { icon: ListChecks, labelKey: "nav.todo", path: "/todo" },
  { icon: Flame, labelKey: "nav.habits", path: "/habits" },
  { icon: Clock, labelKey: "nav.schedule", path: "/schedule" },
  { icon: KeyRound, labelKey: "nav.vault", path: "/vault" },
  { icon: Dumbbell, labelKey: "nav.workouts", path: "/workouts" },
];
