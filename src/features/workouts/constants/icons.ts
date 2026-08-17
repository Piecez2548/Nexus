import {
  Dumbbell,
  HeartPulse,
  Zap,
  Activity,
  Footprints,
  Bike,
  Waves,
  StretchHorizontal,
  PersonStanding,
  Flame,
  MoreHorizontal,
} from "lucide-react";
import type { ComponentType } from "react";

export const ICONS: Record<string, ComponentType<{ size?: number }>> = {
  dumbbell: Dumbbell,
  "heart-pulse": HeartPulse,
  zap: Zap,
  activity: Activity,
  footprints: Footprints,
  bike: Bike,
  waves: Waves,
  "stretch-horizontal": StretchHorizontal,
  "person-standing": PersonStanding,
  flame: Flame,
  "more-horizontal": MoreHorizontal,
};

export const WORKOUT_ICON_OPTIONS = [
  "dumbbell",
  "heart-pulse",
  "zap",
  "activity",
  "footprints",
  "bike",
  "waves",
  "stretch-horizontal",
  "person-standing",
  "flame",
  "more-horizontal",
];

export function getWorkoutIcon(key: string): ComponentType<{ size?: number }> {
  return ICONS[key] ?? MoreHorizontal;
}
