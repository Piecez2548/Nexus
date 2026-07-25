import type { ReactNode } from "react";

interface Props {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}

// Shared mobile-card layout for every list/table in the app — used as the
// `md:hidden` counterpart to a desktop `<table>` so every page collapses to
// the same visual pattern on narrow screens instead of an overflowing table.
export default function MobileRowCard({ leading, title, subtitle, trailing, meta, actions }: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-start gap-3">
        {leading}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 font-medium">{title}</div>
            {trailing && <div className="shrink-0 text-right">{trailing}</div>}
          </div>

          {subtitle && <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</div>}

          {(meta || actions) && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">{meta}</div>
              {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
