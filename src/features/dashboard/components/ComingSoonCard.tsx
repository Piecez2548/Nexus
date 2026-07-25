import type { LucideIcon } from "lucide-react";

import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function ComingSoonCard({ icon: Icon, title, description }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
          <Icon size={20} />
        </div>

        <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-500">
          {t("common.comingSoon")}
        </span>
      </div>

      <h3 className="mt-4 text-base font-semibold text-zinc-700 dark:text-zinc-300">{title}</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">{description}</p>
    </div>
  );
}
