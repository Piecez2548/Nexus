import { getDayOffset } from "@/features/schedule/utils/activity";
import { useTranslation } from "@/i18n/useTranslation";
import type { ScheduleItem } from "@/features/schedule/types";

interface Props {
  next: ScheduleItem | null;
  nextDate: Date | null;
  now: Date;
  className?: string;
}

// A lone recurring item shows up as both "current" (in progress right now)
// and "next" (tomorrow's — or next week's — occurrence), with the exact
// same title and time. Without a day qualifier that reads as a bug, not
// correct behavior — so this always says which day "next" actually falls
// on instead of a bare time.
export default function NextActivityLine({ next, nextDate, now, className }: Props) {
  const { t, language } = useTranslation();

  if (!next || !nextDate) {
    return <p className={className}>{t("schedule.noMoreToday")}</p>;
  }

  const dayOffset = getDayOffset(now, nextDate);
  const label =
    dayOffset <= 0
      ? t("schedule.startsAt", { time: next.startTime })
      : dayOffset === 1
        ? t("schedule.startsTomorrowAt", { time: next.startTime })
        : t("schedule.startsOnWeekdayAt", {
            weekday: nextDate.toLocaleDateString(language === "th" ? "th-TH" : "en-US", { weekday: "long" }),
            time: next.startTime,
          });

  return (
    <p className={className}>
      {t("schedule.nextActivityLabel")}: {next.title} — {label}
    </p>
  );
}
