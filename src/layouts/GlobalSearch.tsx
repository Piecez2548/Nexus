import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { useClickOutside } from "@/hooks/useClickOutside";
import DropdownPanel from "@/components/ui/DropdownPanel";
import { useTranslation } from "@/i18n/useTranslation";

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const results = useGlobalSearch(query);

  useClickOutside(ref, () => setOpen(false));

  function goTo(path: string) {
    setOpen(false);
    setQuery("");
    navigate(path);
  }

  return (
    <div ref={ref} className="relative w-full min-w-0 md:w-[420px]">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500"
      />

      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={t("topbar.searchPlaceholder")}
        className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-brand-500"
      />

      <DropdownPanel
        open={open && query.trim() !== ""}
        className="absolute left-0 top-full z-20 mt-2 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-lg"
      >
        {results.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("topbar.noResults")}
          </p>
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => goTo(result.path)}
                className="flex w-full flex-col items-start rounded-xl px-3 py-2 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span className="text-sm font-medium">{result.label}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{result.sublabel}</span>
              </button>
            ))}
          </div>
        )}
      </DropdownPanel>
    </div>
  );
}
