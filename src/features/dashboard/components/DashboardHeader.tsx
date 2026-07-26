import { Plus } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  onAddTransaction: () => void;
}

export default function DashboardHeader({ onAddTransaction }: Props) {
  const { t, language } = useTranslation();

  return (
    <div className="flex items-center justify-between">

      <div>

        <h1 className="text-3xl font-bold">
          {t("nav.dashboard")}
        </h1>

        <p className="mt-1 text-zinc-600 dark:text-zinc-500">
          {new Date().toLocaleDateString(language === "th" ? "th-TH" : "en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

      </div>

      <button
        onClick={onAddTransaction}
        className="hidden items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-medium transition hover:bg-brand-700 md:flex"
      >
        <Plus size={18} />
        {t("transactions.addTransaction")}
      </button>

    </div>
  );
}
