import { useRef, useState } from "react";
import { Info } from "lucide-react";

import { useClickOutside } from "@/hooks/useClickOutside";
import DropdownPanel from "@/components/ui/DropdownPanel";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  text: string;
  // Popover alignment relative to the icon — cards near the right edge of
  // a grid want it opening leftward so it doesn't clip off the screen.
  align?: "left" | "right";
}

export default function InfoTooltip({ text, align = "right" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("common.moreInfo")}
        aria-expanded={open}
        className="flex h-4 w-4 items-center justify-center rounded-full text-zinc-400 transition hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
      >
        <Info size={14} />
      </button>

      <DropdownPanel
        open={open}
        className={`absolute top-full z-20 mt-2 w-56 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 shadow-lg ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {text}
      </DropdownPanel>
    </div>
  );
}
