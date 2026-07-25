import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function SettingsCard({ title, description, children }: Props) {
  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold">{title}</h2>

      {description && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}

      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
