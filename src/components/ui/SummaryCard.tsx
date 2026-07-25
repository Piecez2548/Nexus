import type { ReactNode } from "react";
import ChangeBadge from "@/components/ui/ChangeBadge";
import { useTranslation } from "@/i18n/useTranslation";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  color?: string;
  change?: number | null;
  invertChange?: boolean;
}

export default function SummaryCard({
  title,
  value,
  icon,
  color = "#3b82f6",
  change,
  invertChange = false,
}: SummaryCardProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 transition hover:border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{title}</span>

        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
      </div>

      <div className="mt-5">
        <h2 className="text-3xl font-bold">{value}</h2>

        {change !== undefined && change !== null && (
          <div className="mt-2 flex items-center gap-1.5">
            <ChangeBadge value={change} invert={invertChange} />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{t("dashboard.vsLastMonth")}</span>
          </div>
        )}
      </div>
    </div>
  );
}