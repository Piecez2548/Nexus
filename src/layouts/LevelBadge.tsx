import { useRef, useState } from "react";
import { Flame } from "lucide-react";

import { useGamificationStore } from "@/store/gamificationStore";
import { getXpProgress } from "@/utils/leveling";
import { useClickOutside } from "@/hooks/useClickOutside";

export default function LevelBadge() {
  const xp = useGamificationStore((s) => s.xp);
  const streak = useGamificationStore((s) => s.streak);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const progress = getXpProgress(xp);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Level and streak"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        <span className="font-semibold text-brand-500">Lv.{progress.level}</span>

        <span className="flex items-center gap-1 text-amber-500">
          <Flame size={14} />
          {streak}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-lg">
          <p className="text-sm font-semibold">Level {progress.level}</p>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {progress.xpIntoLevel} / {progress.xpForNextLevel} XP
          </p>

          <div className="mt-3 flex items-center gap-2 text-sm">
            <Flame size={16} className="text-amber-500" />
            <span>ต่อเนื่อง {streak} วัน</span>
          </div>
        </div>
      )}
    </div>
  );
}
