import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { filterCommands, type Command } from "@/platform/commandPalette/commands";
import { financeMenus, personalMenus, tradingMenus } from "@/layouts/navItems";
import { useUIStore } from "@/features/finance/store/uiStore";
import { useTranslation } from "@/i18n/useTranslation";

// Command Palette (PLT-018): a global Ctrl/Cmd+K palette to search commands,
// navigate, and fire quick actions. Self-contained — it owns its open state and
// the keyboard shortcut, and builds its command list from the app's nav items
// plus a couple of quick actions. `commands` can be injected for tests.
interface Props {
  commands?: Command[];
}

export default function CommandPalette({ commands: injected }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openTransactionDrawer = useUIStore((s) => s.openTransactionDrawer);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    if (injected) return injected;
    const nav: Command[] = [...financeMenus, ...tradingMenus, ...personalMenus].map((m) => ({
      id: `nav:${m.path}`,
      title: t(m.labelKey),
      group: "Navigate",
      run: () => navigate(m.path),
    }));
    nav.push({
      id: "action:add-transaction",
      title: t("common.commandPalette.addTransaction"),
      group: "Actions",
      run: () => openTransactionDrawer(),
    });
    return nav;
  }, [injected, t, navigate, openTransactionDrawer]);

  const results = useMemo(() => filterCommands(commands, query), [commands, query]);

  // Global Ctrl/Cmd+K toggle.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  if (!open) return null;

  const runAt = (index: number): void => {
    const command = results[index];
    if (command) {
      command.run();
      setOpen(false);
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(selected);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 pt-[15vh]"
      role="dialog"
      aria-modal="true"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onListKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 px-4">
          <Search size={18} className="text-zinc-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.commandPalette.placeholder")}
            aria-label={t("common.commandPalette.placeholder")}
            className="w-full bg-transparent py-3 text-sm outline-none"
          />
        </div>

        {results.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("common.commandPalette.empty")}
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1">
            {results.map((command, index) => (
              <li key={command.id}>
                <button
                  type="button"
                  onClick={() => runAt(index)}
                  onMouseEnter={() => setSelected(index)}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                    index === selected ? "bg-brand-600 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>{command.title}</span>
                  {command.group && (
                    <span className={`text-xs ${index === selected ? "text-white/70" : "text-zinc-400"}`}>
                      {command.group}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
