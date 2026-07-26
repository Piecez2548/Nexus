import {
  CalendarDays,
  Sparkles,
} from "lucide-react";

import ComingSoonCard from "@/features/dashboard/components/ComingSoonCard";
import { useTranslation } from "@/i18n/useTranslation";

const MODULES = [
  { icon: CalendarDays, titleKey: "dashboard.calendar", descriptionKey: "dashboard.calendarDescription" },
  { icon: Sparkles, titleKey: "dashboard.aiDailySummary", descriptionKey: "dashboard.aiDailySummaryDescription" },
];

export default function LifeModulesSection() {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{t("dashboard.lifeModules")}</h2>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((module) => (
          <ComingSoonCard
            key={module.titleKey}
            icon={module.icon}
            title={t(module.titleKey)}
            description={t(module.descriptionKey)}
          />
        ))}
      </div>
    </div>
  );
}
