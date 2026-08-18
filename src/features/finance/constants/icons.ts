import {
  Wallet,
  Landmark,
  CreditCard,
  TrendingUp,
  Bitcoin,
  Banknote,
  Smartphone,
  CircleEllipsis,
  Utensils,
  Car,
  ShoppingBag,
  Briefcase,
  GraduationCap,
  HeartPulse,
  Film,
  Zap,
  Plane,
  Shield,
  MoreHorizontal,
  House,
} from "lucide-react";
import type { ComponentType } from "react";

export const ICONS: Record<string, ComponentType<{ size?: number }>> = {
  wallet: Wallet,
  landmark: Landmark,
  "credit-card": CreditCard,
  "trending-up": TrendingUp,
  bitcoin: Bitcoin,
  banknote: Banknote,
  smartphone: Smartphone,
  "circle-ellipsis": CircleEllipsis,
  utensils: Utensils,
  car: Car,
  "shopping-bag": ShoppingBag,
  briefcase: Briefcase,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  film: Film,
  zap: Zap,
  plane: Plane,
  shield: Shield,
  "more-horizontal": MoreHorizontal,
  house: House,
};

export const ACCOUNT_ICON_OPTIONS = [
  "wallet",
  "landmark",
  "credit-card",
  "trending-up",
  "bitcoin",
  "banknote",
  "smartphone",
  "circle-ellipsis",
];

export const CATEGORY_ICON_OPTIONS = [
  "utensils",
  "car",
  "shopping-bag",
  "briefcase",
  "trending-up",
  "graduation-cap",
  "heart-pulse",
  "film",
  "zap",
  "plane",
  "shield",
  "more-horizontal",
];

export const NET_WORTH_ASSET_ICON_OPTIONS = [
  "wallet",
  "landmark",
  "trending-up",
  "house",
  "car",
  "bitcoin",
  "more-horizontal",
];

export const NET_WORTH_LIABILITY_ICON_OPTIONS = [
  "credit-card",
  "banknote",
  "house",
  "more-horizontal",
];

export const SUBSCRIPTION_ICON_OPTIONS = [
  "film",
  "smartphone",
  "zap",
  "credit-card",
  "shopping-bag",
  "heart-pulse",
  "graduation-cap",
  "shield",
  "more-horizontal",
];

export function getIcon(key: string): ComponentType<{ size?: number }> {
  return ICONS[key] ?? MoreHorizontal;
}
