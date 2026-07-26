import type { DashboardPeriodGranularity } from "@/features/dashboard/utils/dashboardPeriodRange";
import { useDashboardPeriodStore } from "@/features/dashboard/store/dashboardPeriodStore";
import { useTranslation } from "@/i18n/useTranslation";

const OPTIONS: Array<{ value: DashboardPeriodGranularity; labelKey: string }> = [
  { value: "day", labelKey: "dashboard.periodDay" },
  { value: "month", labelKey: "dashboard.periodMonth" },
  { value: "year", labelKey: "dashboard.periodYear" },
];

export default function DashboardPeriodSelector() {
  const { granularity, setGranularity } = useDashboardPeriodStore();
  const { t } = useTranslation();

  return (
    <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1">
      {OPTIONS.map(({ value, labelKey }) => (
        <button
          key={value}
          type="button"
          onClick={() => setGranularity(value)}
          aria-pressed={granularity === value}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
            granularity === value
              ? "bg-brand-600 text-white shadow"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
