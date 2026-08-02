import ChangeBadge from "@/components/ui/ChangeBadge";
import { useTranslation } from "@/i18n/useTranslation";

interface MonthFigures {
  income: number;
  expense: number;
  saving: number;
}

interface Changes {
  income: number | null;
  expense: number | null;
  saving: number | null;
}

interface Props {
  monthly: { current: MonthFigures; previous: MonthFigures };
  changes: Changes;
}

const ROWS: {
  key: keyof MonthFigures;
  labelKey: string;
  invertChange?: boolean;
}[] = [
  { key: "income", labelKey: "dashboard.income" },
  { key: "expense", labelKey: "dashboard.expense", invertChange: true },
  { key: "saving", labelKey: "dashboard.savingLabel" },
];

export default function MonthlyOverviewPanel({ monthly, changes }: Props) {
  const { t } = useTranslation();

  const savingsRate =
    monthly.current.income > 0
      ? (monthly.current.saving / monthly.current.income) * 100
      : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold">{t("dashboard.monthlySummaryTitle")}</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {t("dashboard.comparedToPreviousMonth")}
      </p>

      <div className="mt-5 space-y-4">
        {ROWS.map(({ key, labelKey, invertChange }) => {
          const current = monthly.current[key];
          const previous = monthly.previous[key];
          const max = Math.max(Math.abs(current), Math.abs(previous), 1);

          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{t(labelKey)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-700 dark:text-zinc-300">
                    ฿{current.toLocaleString()}
                  </span>
                  <ChangeBadge value={changes[key]} invert={invertChange} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-zinc-400 dark:bg-zinc-600"
                    style={{ width: `${(Math.abs(previous) / max) * 100}%` }}
                  />
                </div>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${(Math.abs(current) / max) * 100}%` }}
                  />
                </div>
              </div>

              <div className="mt-0.5 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>{t("dashboard.previousMonthLabel")} ฿{previous.toLocaleString()}</span>
                <span>{t("dashboard.thisMonthLabel")}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-4">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{t("dashboard.savingsRateLabel")}</span>
        <span className={`text-lg font-bold ${savingsRate >= 0 ? "text-green-500" : "text-red-500"}`}>
          {savingsRate.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
