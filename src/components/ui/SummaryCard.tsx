import type { CSSProperties, ReactNode } from "react";
import "./SummaryCard.css";
import ChangeBadge from "@/components/ui/ChangeBadge";
import { useTranslation } from "@/i18n/useTranslation";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  color?: string;
  change?: number | null;
  invertChange?: boolean;
  changeLabel?: string;
  info?: ReactNode;
}

export default function SummaryCard({
  title,
  value,
  icon,
  color = "#3b82f6",
  change,
  invertChange = false,
  changeLabel,
  info,
}: SummaryCardProps) {
  const { t } = useTranslation();

  return (
    <div className="nexus-summary-card rounded-2xl p-5" style={{ "--summary-color": color } as CSSProperties}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          {title}
          {info}
        </span>

        <div
          className="nexus-summary-icon flex h-10 w-10 items-center justify-center rounded-xl"
        >
          {icon}
        </div>
      </div>

      <div className="mt-5">
        <h2 className="text-3xl font-bold">{value}</h2>

        {change !== undefined && change !== null && (
          <div className="mt-2 flex items-center gap-1.5">
            <ChangeBadge value={change} invert={invertChange} />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{changeLabel ?? t("dashboard.vsLastMonth")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
