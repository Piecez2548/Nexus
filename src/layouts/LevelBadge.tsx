import { memo, useId, useRef, useState } from "react";
import { Flame } from "lucide-react";

import { useGamificationStore } from "@/store/gamificationStore";
import { getXpProgress } from "@/utils/leveling";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useTranslation } from "@/i18n/useTranslation";

function LevelBadge() {
  const panelId = useId();
  const xp = useGamificationStore((s) => s.xp);
  const streak = useGamificationStore((s) => s.streak);
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const progress = getXpProgress(xp);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("common.levelAndStreak")}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        <span className="font-medium">Lv.{progress.level}</span>

        <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
          {streak}
        </span>
      </button>

      {open && (
        <div id={panelId} role="region" aria-label={t("common.levelAndStreak")} className="main-popover main-level rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-lg">
          <p className="text-sm font-semibold">{t("common.levelNumber", { level: progress.level })}</p>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {progress.xpIntoLevel} / {progress.xpForNextLevel} XP
          </p>

          <div className="mt-3 flex items-center gap-2 text-sm">
            <Flame size={16} className="main-warning-text" />
            <span>{t("common.streakDays", { count: streak })}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(LevelBadge);
