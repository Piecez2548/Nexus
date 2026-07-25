import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  message: string;
  onRetry: () => void;
}

export default function ErrorState({ message, onRetry }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-900/50 bg-red-950/30 p-6 text-center">
      <p className="text-sm text-red-400">{message}</p>

      <button
        onClick={onRetry}
        className="rounded-xl border border-red-800 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-900/40"
      >
        {t("common.retry")}
      </button>
    </div>
  );
}
