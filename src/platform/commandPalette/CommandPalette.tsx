import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useModalA11y } from "@/components/ui/useModalA11y";

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
  const panelRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open, onClose: () => setOpen(false), containerRef: panelRef });

  const commands = useMemo<Command[]>(() => {
    if (injected) return injected;
    const nav: Command[] = [...financeMenus, ...tradingMenus, ...personalMenus].map((m) => ({
      id: `nav:${m.path}`,
      title: t(m.labelKey),
      group: t("common.commandPalette.navigationGroup"),
      run: () => navigate(m.path),
    }));
    nav.push({
      id: "action:add-transaction",
      title: t("common.commandPalette.addTransaction"),
      group: t("common.commandPalette.actionsGroup"),
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
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (open) panelRef.current?.querySelectorAll("li button")[selected]?.scrollIntoView?.({ block: "nearest" });
  }, [open, selected]);

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
      setSelected((s) => Math.max(0, Math.min(s + 1, results.length - 1)));
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
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 px-3 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label={t("common.commandPalette.title")}
      onClick={() => setOpen(false)}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 px-4">
          <Search size={18} className="text-zinc-400" />
          <input
            ref={inputRef}
            onKeyDown={onListKeyDown}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.commandPalette.placeholder")}
            aria-label={t("common.commandPalette.placeholder")}
            className="min-w-0 w-full bg-transparent py-3 text-base outline-none placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
          />
          <button type="button" aria-label={t("common.close")} onClick={() => setOpen(false)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={18} /></button>
        </div>

        <p role="status" className="sr-only">{results[selected]?.title}</p>

        {results.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("common.commandPalette.empty")}
          </div>
        ) : (
          <ul className="max-h-[60dvh] overflow-y-auto py-1">
            {results.map((command, index) => (
              <li key={command.id}>
                <button
                  type="button"
                  onClick={() => runAt(index)}
                  onMouseEnter={() => setSelected(index)}
                  onFocus={() => setSelected(index)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${
                    index === selected ? "nexus-primary-action" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>{command.title}</span>
                  {command.group && (
                    <span className={`text-xs ${index === selected ? "text-current" : "text-zinc-500 dark:text-zinc-400"}`}>
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
