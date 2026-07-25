import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  bestStrategy: string | null;
  worstStrategy: string | null;
}

export default function StrategyInsights({ bestStrategy, worstStrategy }: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("trading.bestStrategy")}</p>
        <p className="mt-2 text-xl font-bold text-green-400">
          {bestStrategy ?? "—"}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("trading.worstStrategy")}</p>
        <p className="mt-2 text-xl font-bold text-red-400">
          {worstStrategy ?? "—"}
        </p>
      </div>
    </div>
  );
}
