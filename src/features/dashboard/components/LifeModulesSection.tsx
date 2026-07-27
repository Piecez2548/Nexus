import {
  Sparkles,
} from "lucide-react";

import ComingSoonCard from "@/features/dashboard/components/ComingSoonCard";
import { useTranslation } from "@/i18n/useTranslation";

const MODULES = [
  { icon: Sparkles, titleKey: "dashboard.aiDailySummary", descriptionKey: "dashboard.aiDailySummaryDescription" },
];

export default function LifeModulesSection() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {MODULES.map((module) => (
        <ComingSoonCard
          key={module.titleKey}
          icon={module.icon}
          title={t(module.titleKey)}
          description={t(module.descriptionKey)}
        />
      ))}
    </div>
  );
}
