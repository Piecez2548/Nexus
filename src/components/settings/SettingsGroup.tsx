import type { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
}

// A small uppercase eyebrow label above a cluster of related SettingsCards,
// so the page reads as a handful of clear categories instead of one long
// undifferentiated list.
export default function SettingsGroup({ title, children }: Props) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
