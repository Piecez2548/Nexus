import { Store } from "lucide-react";
import ChartCard from "@/components/ui/ChartCard";
import MerchantDetailList from "@/features/finance/aiAnalytics/components/merchantAnalysis/MerchantDetailList";
import { useTranslation } from "@/i18n/useTranslation";
import type { TopMerchantEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

interface Props {
  merchants: TopMerchantEntry[];
}

export default function MerchantAnalysisSection({ merchants }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Store size={20} className="text-teal-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.merchantAnalysis.title")}</h2>
      </div>

      <ChartCard title={t("aiAnalytics.behaviorAnalysis.topMerchants")}>
        <MerchantDetailList merchants={merchants} />
      </ChartCard>
    </div>
  );
}
