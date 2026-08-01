import type { ReactNode } from "react";

interface Props {
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export default function ChartCard({
  title,
  headerExtra,
  children,
}: Props) {
  return (
    <div className="h-full min-w-0 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {title}
        </h2>

        {headerExtra}
      </div>

      {children}
    </div>
  );
}
