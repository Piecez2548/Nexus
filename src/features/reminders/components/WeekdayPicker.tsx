import { useTranslation } from "@/i18n/useTranslation";

// JS Date#getDay() order: 0=Sunday..6=Saturday.
const WEEKDAY_KEYS = [
  "reminders.weekdaySun",
  "reminders.weekdayMon",
  "reminders.weekdayTue",
  "reminders.weekdayWed",
  "reminders.weekdayThu",
  "reminders.weekdayFri",
  "reminders.weekdaySat",
] as const;

interface Props {
  value: number[];
  onChange: (weekdays: number[]) => void;
}

export default function WeekdayPicker({ value, onChange }: Props) {
  const { t } = useTranslation();

  function toggle(weekday: number) {
    onChange(
      value.includes(weekday) ? value.filter((d) => d !== weekday) : [...value, weekday].sort((a, b) => a - b)
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {WEEKDAY_KEYS.map((key, weekday) => {
        const selected = value.includes(weekday);
        return (
          <button
            key={weekday}
            type="button"
            onClick={() => toggle(weekday)}
            aria-pressed={selected}
            className={`h-9 w-9 rounded-full text-sm font-medium transition ${
              selected
                ? "bg-brand-600 text-white"
                : "border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-brand-500"
            }`}
          >
            {t(key)}
          </button>
        );
      })}
    </div>
  );
}
