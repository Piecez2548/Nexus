import type { ChangeEvent } from "react";

interface Props {
  id?: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
}

export default function FileField({ id, value, onChange }: Props) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      onChange(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <input
        id={id}
        type="file"
        onChange={handleChange}
        className="w-full text-sm text-zinc-500 dark:text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 dark:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-800 dark:text-zinc-200"
      />

      {value && (
        <a
          href={value}
          download
          className="inline-block text-xs text-violet-400 hover:underline"
        >
          ดูไฟล์แนบ
        </a>
      )}
    </div>
  );
}
