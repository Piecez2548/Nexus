import { useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  onSubmit: (question: string) => void;
}

export default function AiCoachInput({ onSubmit }: Props) {
  const [value, setValue] = useState("");
  const { t } = useTranslation();

  function submit() {
    const trimmed = value.trim();
    if (trimmed === "") return;
    onSubmit(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("aiAnalytics.aiCoach.inputPlaceholder")}
        className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm outline-none transition focus:border-brand-500"
      />
      <button
        type="button"
        onClick={submit}
        disabled={value.trim() === ""}
        aria-label={t("aiAnalytics.aiCoach.send")}
        className="flex shrink-0 items-center justify-center rounded-2xl bg-brand-500 p-3 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
