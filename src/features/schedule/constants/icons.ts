import {
  Sunrise,
  Coffee,
  Briefcase,
  Dumbbell,
  BookOpen,
  Utensils,
  Moon,
  HeartPulse,
  Users,
  Music,
  Car,
  MoreHorizontal,
} from "lucide-react";
import type { ComponentType } from "react";

export const ICONS: Record<string, ComponentType<{ size?: number }>> = {
  sunrise: Sunrise,
  coffee: Coffee,
  briefcase: Briefcase,
  dumbbell: Dumbbell,
  "book-open": BookOpen,
  utensils: Utensils,
  moon: Moon,
  "heart-pulse": HeartPulse,
  users: Users,
  music: Music,
  car: Car,
  "more-horizontal": MoreHorizontal,
};

export const SCHEDULE_ICON_OPTIONS = Object.keys(ICONS);

export function getIcon(key: string): ComponentType<{ size?: number }> {
  return ICONS[key] ?? MoreHorizontal;
}
