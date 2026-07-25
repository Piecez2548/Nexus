import type { ChangeEvent } from "react";
import { X } from "lucide-react";

import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  id?: string;
  values: string[];
  onChange: (urls: string[]) => void;
}

export default function MultiFileField({ id, values, onChange }: Props) {
  const { t } = useTranslation();

  function handleAdd(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => onChange([...values, reader.result as string]);
    reader.readAsDataURL(file);

    event.target.value = "";
  }

  function handleRemove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <input
        id={id}
        type="file"
        accept="image/*"
        onChange={handleAdd}
        className="w-full text-sm text-zinc-500 dark:text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 dark:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-800 dark:text-zinc-200"
      />

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((url, index) => (
            <div key={index} className="relative">
              <img
                src={url}
                alt={t("common.screenshotN", { n: index + 1 })}
                className="h-16 w-16 rounded-lg object-cover"
              />

              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label={t("common.removeScreenshotN", { n: index + 1 })}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-zinc-900 dark:text-white hover:bg-red-700"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
